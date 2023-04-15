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
import { ERC20 } from './ERC20';

const BET_FOR_TOKEN_KEY = Field(1);
const BET_AGAINST_TOKEN_KEY = Field(2);
const ORACLE_KEY = Field(3);
const START_KEY = Field(4);
const DURATION_KEY = Field(5);

export class Event extends SmartContract {
  @state(Field) mapRoot = State<Field>();

  @state(UInt32) betsAgainst = State<UInt64>();
  @state(UInt32) betsFor = State<UInt64>();

  @state(Bool) result = State<Bool>();

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

  initState(initialRoot: Field) {
    this.mapRoot.set(initialRoot);
  }

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
    const payerUpdate = AccountUpdate.create(user);
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
    const betToken = new ERC20(tokenPk);
    betToken.mint(user, amount);

    // Update bets count
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

  // DELEGATE AND EARN FEE?
}
