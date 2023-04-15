import {
  Field,
  SmartContract,
  state,
  State,
  method,
  UInt32,
  PublicKey,
  Bool,
  MerkleMapWitness,
  AccountUpdate,
  UInt64,
  Permissions,
  Circuit,
  Poseidon,
} from 'snarkyjs';
import { Token } from './Token';

const RESULT_NOT_SET = new Field(0);
const BET_FOR_TOKEN_KEY = Field(1);
const BET_AGAINST_TOKEN_KEY = Field(2);
const ORACLE_KEY = Field(3);
const START_KEY = Field(4);
const END_KEY = Field(5);

export class BettingEvent extends SmartContract {
  @state(Field) mapRoot = State<Field>();

  @state(UInt32) betsAgainst = State<UInt64>();
  @state(UInt32) betsFor = State<UInt64>();

  @state(UInt32) result = State<Field>();

  init() {
    super.init();
    this.account.permissions.set({
      ...Permissions.default(),
      send: Permissions.proof(),
      setVerificationKey: Permissions.impossible(),
      setPermissions: Permissions.impossible(),
      access: Permissions.proofOrSignature(),
    });
  }

  // initState() {}

  // DEV: should we use this.sender instead of user?
  // Having the user in params we allow the other party to submit and pay for the transaction just having the signature of the user.
  // On the other hand, it probably can have some security implications.
  @method bet(
    user: PublicKey,
    amount: UInt64,
    side: Bool,
    tokenWitness: MerkleMapWitness,
    tokenPk: PublicKey,
    startWitness: MerkleMapWitness,
    start: UInt64
  ): void {
    // Send deposit to contract
    const payerUpdate = AccountUpdate.createSigned(user);
    payerUpdate.send({ to: this.address, amount: UInt64.from(amount) });

    // Get the on-chain commitment for the public data stored off-chain
    const initialRoot = this.mapRoot.get();
    this.mapRoot.assertEquals(initialRoot);

    // Ensure the start from off-chain storage is valid
    const startHash = Poseidon.hash(start.toFields());
    const [rootFromTimeWitness, startKey] =
      startWitness.computeRootAndKey(startHash);
    rootFromTimeWitness.assertEquals(initialRoot);
    START_KEY.assertEquals(startKey);

    // Check that event didn't started
    const now = this.network.timestamp.get();
    start.assertGreaterThan(now);

    // Get the hash of the token address to enable it as a key
    const betTokenKey = Circuit.if(
      side,
      BET_FOR_TOKEN_KEY,
      BET_AGAINST_TOKEN_KEY
    );
    const tokenHash = Poseidon.hash(tokenPk.toFields());

    // check the initial state matches what we expect
    const [rootFromTokenWitness, key] =
      tokenWitness.computeRootAndKey(tokenHash);
    rootFromTokenWitness.assertEquals(initialRoot);
    betTokenKey.assertEquals(key);

    // Mint bet tokens
    const betToken = new Token(tokenPk);
    betToken.mint(user, amount);

    // Update bets count
    // DEV: better use Circuit.if but it's not clear how to execute few instructions in the if branch
    if (side) {
      const betsAgainst = this.betsAgainst.get();
      this.betsAgainst.assertEquals(betsAgainst);
      this.betsAgainst.set(betsAgainst.add(amount));
    } else {
      const betsFor = this.betsFor.get();
      this.betsFor.assertEquals(betsFor);
      this.betsFor.set(betsFor.add(amount));
    }
  }

  @method claim(
    user: PublicKey,
    tokenWitness: MerkleMapWitness,
    tokenPk: PublicKey
  ): void {
    // Get the result
    const result = this.result.get();
    this.result.assertEquals(result);

    // Check that result already known
    result.assertGreaterThan(RESULT_NOT_SET);

    // Get the on-chain commitment for the public data stored off-chain
    const initialRoot = this.mapRoot.get();
    this.mapRoot.assertEquals(initialRoot);

    // Get the hash of the token address to enable it as a key
    const betTokenKey = result;
    const tokenHash = Poseidon.hash(tokenPk.toFields());

    // check the initial state matches what we expect
    const [rootFromTokenWitness, key] =
      tokenWitness.computeRootAndKey(tokenHash);
    rootFromTokenWitness.assertEquals(initialRoot);
    betTokenKey.toFields()[0].assertEquals(key);

    // Get user's bet size
    const betToken = new Token(tokenPk);
    const amount = betToken.balanceOf(user);

    // Burn bet tokens after payout
    betToken.burn(user, amount);

    // Get bets size and ensure they are equal to the one stored in storage
    const betsAgainst = this.betsAgainst.get();
    this.betsAgainst.assertEquals(betsAgainst);
    const betsFor = this.betsFor.get();
    this.betsFor.assertEquals(betsFor);

    // Calculate rewards amount
    const winnerBets = Circuit.if(
      result.equals(BET_AGAINST_TOKEN_KEY),
      betsAgainst,
      betsFor
    );
    const reward = amount.mul(betsAgainst.add(betsFor)).div(winnerBets);

    // Send reward to user
    this.send({ to: user, amount: reward });
  }
}
