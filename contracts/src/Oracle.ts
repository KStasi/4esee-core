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
  AccountUpdate,
  UInt64,
  Permissions,
  Circuit,
} from 'snarkyjs';

export class Oracle extends SmartContract {
  @method getResult(): Field {
    return new Field(1);
  }
}
