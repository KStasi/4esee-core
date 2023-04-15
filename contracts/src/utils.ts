import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  Poseidon,
  MerkleMap,
  UInt64,
} from 'snarkyjs';

import { BettingEvent } from './BettingEvent.js';
import { Token } from './Token.js';
import { Oracle } from './Oracle.js';
import { idsForMap } from './constants.js';

function createLocalBlockchain() {
  // Dev: Create a local blockchain with proofsEnabled = false for faster testing
  // and accountCreationFee = 0.1e3 to avoid lack of funds during execution
  const Local = Mina.LocalBlockchain({
    proofsEnabled: false,
    accountCreationFee: 0.1e3,
  });
  Mina.setActiveInstance(Local);
  return Local.testAccounts[0].privateKey;
}

async function deployToken(
  zkAppInstance: Token,
  zkAppPrivatekey: PrivateKey,
  deployerPrivatekey: PrivateKey
) {
  await deployContract(zkAppInstance, zkAppPrivatekey, deployerPrivatekey);
}

async function deployOracle(
  zkAppInstance: Oracle,
  zkAppPrivatekey: PrivateKey,
  deployerPrivatekey: PrivateKey
) {
  await deployContract(zkAppInstance, zkAppPrivatekey, deployerPrivatekey);
}

async function deployEvent(
  zkAppInstance: BettingEvent,
  zkAppPrivatekey: PrivateKey,
  deployerPrivatekey: PrivateKey,
  mapRoot: Field
) {
  await deployContract(
    zkAppInstance,
    zkAppPrivatekey,
    deployerPrivatekey,
    () => {
      zkAppInstance.initState(mapRoot);
    }
  );
}

async function deployContract(
  zkAppInstance: BettingEvent | Token | Oracle,
  zkAppPrivatekey: PrivateKey,
  deployerPrivatekey: PrivateKey,
  extraActions: any = null
) {
  const deployerAccount = deployerPrivatekey.toPublicKey();
  const tx = await Mina.transaction(
    { sender: deployerAccount, fee: 0.1e9 },
    () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkAppInstance.deploy({ zkappKey: zkAppPrivatekey });
      zkAppInstance.init();
      if (extraActions) extraActions();
    }
  );
  await tx.prove();
  let sentTx = await tx.sign([zkAppPrivatekey, deployerPrivatekey]).send();
  await sentTx.wait();
  return sentTx;
}

async function prepareAddresses(): Promise<{
  tokenAgainstAddress: PublicKey;
  tokenForAddress: PublicKey;
  oracleAddress: PublicKey;
  eventAddress: PublicKey;
  tokenAgainstPrivateKey: PrivateKey;
  tokenForPrivateKey: PrivateKey;
  oraclePrivateKey: PrivateKey;
  eventPrivateKey: PrivateKey;
}> {
  const tokenForPrivateKey = PrivateKey.random();
  const tokenAgainstPrivateKey = PrivateKey.random();
  const oraclePrivateKey = PrivateKey.random();
  const eventPrivateKey = PrivateKey.random();

  const tokenForAddress = tokenForPrivateKey.toPublicKey();
  const tokenAgainstAddress = tokenAgainstPrivateKey.toPublicKey();
  const oracleAddress = oraclePrivateKey.toPublicKey();
  const eventAddress = eventPrivateKey.toPublicKey();
  return {
    tokenForPrivateKey,
    tokenAgainstPrivateKey,
    oraclePrivateKey,
    eventPrivateKey,
    tokenForAddress,
    tokenAgainstAddress,
    oracleAddress,
    eventAddress,
  };
}

async function deployAllContracts(deployerPrivateKey: PrivateKey): Promise<{
  tokenAgainstAddress: PublicKey;
  tokenForAddress: PublicKey;
  oracleAddress: PublicKey;
  eventAddress: PublicKey;
  tokenAgainstPrivateKey: PrivateKey;
  tokenForPrivateKey: PrivateKey;
  oraclePrivateKey: PrivateKey;
  eventPrivateKey: PrivateKey;
}> {
  const {
    tokenAgainstAddress,
    tokenForAddress,
    oracleAddress,
    eventAddress,
    tokenAgainstPrivateKey,
    tokenForPrivateKey,
    oraclePrivateKey,
    eventPrivateKey,
  } = await prepareAddresses();

  const tokenForInstance = new Token(tokenForAddress);
  const tokenAgainstInstance = new Token(tokenAgainstAddress);
  const oracleInstance = new Oracle(oracleAddress);

  await deployToken(tokenForInstance, tokenForPrivateKey, deployerPrivateKey);
  await deployToken(
    tokenAgainstInstance,
    tokenAgainstPrivateKey,
    deployerPrivateKey
  );
  await deployOracle(oracleInstance, oraclePrivateKey, deployerPrivateKey);

  const eventInstance = new BettingEvent(eventAddress);
  // TODO: use real mapRoot
  const map = new MerkleMap();

  const keyTokenAgainstHash = Poseidon.hash(tokenAgainstAddress.toFields());
  const keyTokenForHash = Poseidon.hash(tokenForAddress.toFields());
  const keyOracleHash = Poseidon.hash(oracleAddress.toFields());
  const startLag = 1000;
  const duration = 1000;
  const startTimestamp = Date.now() + startLag;
  const emdTimestamp = startTimestamp + duration;

  const startDate = Poseidon.hash(UInt64.from(startTimestamp).toFields());
  const endDate = Poseidon.hash(UInt64.from(emdTimestamp).toFields());

  map.set(Field(idsForMap.BET_AGAINST_TOKEN_KEY), keyTokenAgainstHash);
  map.set(Field(idsForMap.BET_FOR_TOKEN_KEY), keyTokenForHash);
  map.set(Field(idsForMap.ORACLE_KEY), keyOracleHash);
  map.set(Field(idsForMap.START_KEY), startDate);
  map.set(Field(idsForMap.END_KEY), endDate);

  await deployEvent(
    eventInstance,
    eventPrivateKey,
    deployerPrivateKey,
    map.getRoot()
  );

  return {
    tokenAgainstAddress,
    tokenForAddress,
    oracleAddress,
    eventAddress,
    tokenAgainstPrivateKey,
    tokenForPrivateKey,
    oraclePrivateKey,
    eventPrivateKey,
  };
}

export {
  createLocalBlockchain,
  deployToken,
  deployOracle,
  deployEvent,
  deployAllContracts,
};
