import {
  Field,
  SmartContract,
  state,
  State,
  method,
  UInt32,
  PublicKey,
  Bool,
  PrivateKey,
  MerkleMapWitness,
  AccountUpdate,
  UInt64,
  Permissions,
  Circuit,
} from 'snarkyjs';
import { ERC20 } from './ERC20';

export class Event extends SmartContract {
  // 1 - betForToken
  // 2 - betAgainstToken
  // 3 - oracle
  // 4 - startTimestamp
  // 5 - duration
  @state(Field) mapRoot = State<Field>();

  @state(UInt32) betsFor = State<UInt32>();
  @state(UInt32) betsAgainst = State<UInt32>();

  @state(Bool) result = State<Bool>();

  init() {
    super.init();
    this.account.permissions.set({
      ...Permissions.default(),
      send: Permissions.proofOrSignature(),
    });
  }

  initState(initialRoot: Field) {
    this.mapRoot.set(initialRoot);
  }

  // idea use switch for key
  // remove side
  // add hashing
  @method bet(
    user: PublicKey,
    amount: UInt32,
    side: Bool,
    keyWitness: MerkleMapWitness,
    tokenValue: PublicKey
  ): void {
    // Check if the requirements are met:
    // - event not started
    // Send deposit to contract
    const payerUpdate = AccountUpdate.create(user);
    payerUpdate.send({ to: this.address, amount: UInt64.from(amount) });
    //   // get bets token
    //   const initialRoot = this.mapRoot.get();
    //   this.mapRoot.assertEquals(initialRoot);
    //   let betTokenKey = Circuit.if(side, Field(1), Field(2));
    //   // check the initial state matches what we expect
    //   const [rootBefore, key] = keyWitness.computeRootAndKey(
    //     tokenValue.()
    //   );
    //   rootBefore.assertEquals(initialRoot);
    //   betTokenKey.assertEquals(key);
    //   // Update bets
    //   let betTokenAddress = Circuit.if(
    //     side,
    //     this.betForToken.get(),
    //     this.betAgainstToken.get()
    //   );
    //   let betToken = new ERC20(betTokenAddress);
  }

  // DELEGATE AND EARN FEE?
}
