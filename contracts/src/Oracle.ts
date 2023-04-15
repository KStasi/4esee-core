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
import { ERC20 } from './ERC20';

export class Oracle extends SmartContract {
  @method getResult(): Field {
    return new Field(1);
  }
}
