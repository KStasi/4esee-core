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
      const startLag = 1000;
      const duration = 1000;
      const startTimestamp = Date.now() + startLag;
      const endTimestamp = startTimestamp + duration;
      const eventDescription = 'Beastcost will win the ESL Championship';

      let {
        tokenAgainstAddress,
        tokenForAddress,
        oracleAddress,
        eventAddress,
        tokenAgainstPrivateKey,
        tokenForPrivateKey,
        oraclePrivateKey,
        eventPrivateKey,
      } = await deployAllContracts(
        deployerPrivateKey,
        startTimestamp,
        endTimestamp,
        eventDescription
      );
      const merkleMapValues = {
        BET_FOR_TOKEN_KEY: tokenForAddress.toBase58(),
        BET_AGAINST_TOKEN_KEY: tokenAgainstAddress.toBase58(),
        ORACLE_KEY: oracleAddress.toBase58(),
        START_KEY: startTimestamp,
        END_KEY: endTimestamp,
        DESCRIPTION_KEY: eventDescription,
      };

      // TODO: verify initial storage
    });
  });
});
