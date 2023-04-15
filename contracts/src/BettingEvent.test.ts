import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
} from 'snarkyjs';

import { BettingEvent } from './BettingEvent';

function createLocalBlockchain() {
  // Create a local blockchain with proofsEnabled = false for faster testing
  const Local = Mina.LocalBlockchain({ proofsEnabled: false });
  Mina.setActiveInstance(Local);
  return Local.testAccounts[0].privateKey;
}
async function localDeploy(
  zkAppInstance: BettingEvent,
  zkAppPrivatekey: PrivateKey,
  deployerPrivatekey: PrivateKey,
  deployerAccount: PublicKey,
  mapRoot: Field
) {
  const tx = await Mina.transaction(
    { sender: deployerAccount, fee: 0.1e9 },
    () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkAppInstance.deploy({ zkappKey: zkAppPrivatekey });
      zkAppInstance.init();
      zkAppInstance.initState(mapRoot);
    }
  );
  await tx.prove();
  let sentTx = await tx.sign([zkAppPrivatekey, deployerPrivatekey]).send();
  expect(sentTx.hash() != undefined);
}

describe('BettingEvent.js', () => {
  let deployerPrivateKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey;

  beforeEach(async () => {
    await isReady;
    deployerPrivateKey = createLocalBlockchain();
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
  });

  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  describe('BettingEvent()', () => {
    it('generates and deploys the `BettingEvent` smart contract', async () => {
      const zkAppInstance = new BettingEvent(zkAppAddress);
      await localDeploy(
        zkAppInstance,
        zkAppPrivateKey,
        deployerPrivateKey,
        deployerPrivateKey.toPublicKey(),
        Field.one
      );
    });
  });
});
