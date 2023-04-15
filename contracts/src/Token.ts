import {
  Bool,
  CircuitString,
  DeployArgs,
  Field,
  method,
  PublicKey,
  SmartContract,
  UInt64,
  Permissions,
  Account,
} from 'snarkyjs';

export class Token extends SmartContract {
  init() {
    super.init();
    this.account.tokenSymbol.set('BET');

    // make account non-upgradable forever
    this.account.permissions.set({
      ...Permissions.default(),
      send: Permissions.proof(),
    });
  }

  // ERC20 API
  name(): CircuitString {
    return CircuitString.fromString('BetCoin');
  }
  symbol(): CircuitString {
    return CircuitString.fromString('BET');
  }
  decimals(): Field {
    return Field(9);
  }

  balanceOf(owner: PublicKey): UInt64 {
    let account = Account(owner, this.token.id);
    let balance = account.balance.get();
    account.balance.assertEquals(balance);
    return balance;
  }

  @method mint(to: PublicKey, value: UInt64): Bool {
    // TODO: how to authorize minting from another zkApp?
    this.token.mint({
      address: to,
      amount: value,
    });
    return Bool(true);
  }

  @method burn(from: PublicKey, value: UInt64): Bool {
    // TODO: how to authorize minting from another zkApp?
    this.token.burn({
      address: from,
      amount: value,
    });
    return Bool(true);
  }
}
