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
  deployerAddress: PublicKey
) {
  return await prepareContractParams(
    zkAppInstance,
    zkAppPrivatekey,
    deployerAddress
  );
}

async function deployOracle(
  zkAppInstance: Oracle,
  zkAppPrivatekey: PrivateKey,
  deployerAddress: PublicKey
) {
  return await prepareContractParams(
    zkAppInstance,
    zkAppPrivatekey,
    deployerAddress
  );
}

async function deployEvent(
  zkAppInstance: BettingEvent,
  zkAppPrivatekey: PrivateKey,
  deployerAddress: PublicKey,
  mapRoot: Field
) {
  return await prepareContractParams(
    zkAppInstance,
    zkAppPrivatekey,
    deployerAddress,
    () => {
      zkAppInstance.initState(mapRoot);
    }
  );
}

async function prepareContractParams(
  zkAppInstance: BettingEvent | Token | Oracle,
  zkAppPrivatekey: PrivateKey,
  deployerAccount: PublicKey,
  extraActions: any = null
): Promise<() => void> {
  return () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    zkAppInstance.deploy({ zkappKey: zkAppPrivatekey });
    zkAppInstance.init();
    if (extraActions) extraActions();
  };
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
  console.log(tokenAgainstAddress.toBase58());
  console.log(tokenForAddress.toBase58());
  console.log(oracleAddress.toBase58());
  console.log(eventAddress.toBase58());

  const tokenForInstance = new Token(tokenForAddress);
  const tokenAgainstInstance = new Token(tokenAgainstAddress);
  const oracleInstance = new Oracle(oracleAddress);

  const deployerAccount = deployerPrivateKey.toPublicKey();

  const tokenForParams = await deployToken(
    tokenForInstance,
    tokenForPrivateKey,
    deployerAccount
  );
  const tokenAgainstParams = await deployToken(
    tokenAgainstInstance,
    tokenAgainstPrivateKey,
    deployerAccount
  );
  const oracleParams = await deployOracle(
    oracleInstance,
    oraclePrivateKey,
    deployerAccount
  );

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

  const eventParams = await deployEvent(
    eventInstance,
    eventPrivateKey,
    deployerAccount,
    map.getRoot()
  );

  const tx = await Mina.transaction(
    { sender: deployerAccount, fee: 0.1e9 },
    () => {
      tokenForParams();
      tokenAgainstParams();
      oracleParams();
      eventParams();
    }
  );

  await tx.prove();
  let sentTx = await tx
    .sign([
      tokenAgainstPrivateKey,
      tokenForPrivateKey,
      oraclePrivateKey,
      deployerPrivateKey,
    ])
    .send();
  await sentTx.wait();

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
