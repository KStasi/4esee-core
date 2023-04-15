import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  MerkleMap,
  Poseidon,
  UInt64,
} from 'snarkyjs';

import { deployAllContracts, createLocalBlockchain } from './utils';

// function createLocalBlockchain() {
//   // Dev: Create a local blockchain with proofsEnabled = false for faster testing
//   // and accountCreationFee = 0.1e3 to avoid lack of funds during execution
//   const Local = Mina.LocalBlockchain({
//     proofsEnabled: false,
//     accountCreationFee: 0.1e3,
//   });
//   Mina.setActiveInstance(Local);
//   return Local.testAccounts[0].privateKey;
// }

// // async function deployToken(
// //   zkAppInstance: Token,
// //   zkAppPrivatekey: PrivateKey,
// //   deployerPrivatekey: PrivateKey
// // ) {
// //   const deployerAccount = deployerPrivatekey.toPublicKey();
// //   const tx = await Mina.transaction(
// //     { sender: deployerAccount, fee: 0.1e9 },
// //     () => {
// //       AccountUpdate.fundNewAccount(deployerAccount);
// //       zkAppInstance.deploy({ zkappKey: zkAppPrivatekey });
// //       zkAppInstance.init();
// //     }
// //   );
// //   await tx.prove();
// //   let sentTx = await tx.sign([zkAppPrivatekey, deployerPrivatekey]).send();
// //   expect(sentTx.hash() != undefined);
// // }
// async function deployOracle(
//   zkAppInstance: Oracle,
//   zkAppPrivatekey: PrivateKey,
//   deployerPrivatekey: PrivateKey
// ) {
//   const deployerAccount = deployerPrivatekey.toPublicKey();
//   const tx = await Mina.transaction(
//     { sender: deployerAccount, fee: 0.1e9 },
//     () => {
//       AccountUpdate.fundNewAccount(deployerAccount);
//       zkAppInstance.deploy({ zkappKey: zkAppPrivatekey });
//       zkAppInstance.init();
//     }
//   );
//   await tx.prove();
//   let sentTx = await tx.sign([zkAppPrivatekey, deployerPrivatekey]).send();
//   expect(sentTx.hash() != undefined);
// }

// async function deployEvent(
//   zkAppInstance: BettingEvent,
//   zkAppPrivatekey: PrivateKey,
//   deployerPrivatekey: PrivateKey,
//   mapRoot: Field
// ) {
//   const deployerAccount = deployerPrivatekey.toPublicKey();
//   const tx = await Mina.transaction(
//     { sender: deployerAccount, fee: 0.1e9 },
//     () => {
//       AccountUpdate.fundNewAccount(deployerAccount);
//       zkAppInstance.deploy({ zkappKey: zkAppPrivatekey });
//       zkAppInstance.init();
//       zkAppInstance.initState(mapRoot);
//     }
//   );
//   await tx.prove();
//   let sentTx = await tx.sign([zkAppPrivatekey, deployerPrivatekey]).send();
//   expect(sentTx.hash() != undefined);
// }

describe('BettingEvent.js', () => {
  let deployerPrivateKey: PrivateKey;

  beforeEach(async () => {
    await isReady;
    deployerPrivateKey = createLocalBlockchain();
  });

  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  describe('BettingEvent()', () => {
    it('generates and deploys the `BettingEvent` smart contract', async () => {
      let {
        tokenAgainstAddress,
        tokenForAddress,
        oracleAddress,
        eventAddress,
        tokenAgainstPrivateKey,
        tokenForPrivateKey,
        oraclePrivateKey,
        eventPrivateKey,
      } = await deployAllContracts(deployerPrivateKey);

      // TODO: verify initial storage
    });
  });
});
