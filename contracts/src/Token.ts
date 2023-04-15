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

/**
 * A simple ERC20 token
 *
 * Tokenomics:
 * The supply is constant and the entire supply is initially sent to an account controlled by the zkApp developer
 * After that, tokens can be sent around with authorization from their owner, but new ones can't be minted.
 *
 * Functionality:
 * Just enough to be swapped by the DEX contract, and be secure
 */
export class Token extends SmartContract {
  deploy(args: DeployArgs) {
    super.deploy(args);
    this.account.tokenSymbol.set('BET');
    // this.account.permissions.set({
    //   ...Permissions.default(),
    //   setPermissions: Permissions.proof(),
    // });
  }

  @method init() {
    super.init();

    // make account non-upgradable forever
    this.account.permissions.set({
      ...Permissions.default(),
      // setVerificationKey: Permissions.impossible(),
      // setPermissions: Permissions.impossible(),
      send: Permissions.proofOrSignature(),
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
    this.token.mint({
      address: to,
      amount: value,
    });
    return Bool(true);
  }

  @method burn(from: PublicKey, value: UInt64): Bool {
    this.token.burn({
      address: from,
      amount: value,
    });
    return Bool(true);
  }
}
