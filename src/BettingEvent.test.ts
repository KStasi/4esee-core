import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  MerkleMap,
  Bool,
  Poseidon,
  UInt64,
} from 'snarkyjs';

import { deployAllContracts, createLocalBlockchain, prepareMap } from './utils';
import { BettingEvent } from './BettingEvent.js';

describe('BettingEvent.js', () => {
  let deployerPrivateKey: PrivateKey;

  beforeEach(async () => {
    await isReady;
    deployerPrivateKey = createLocalBlockchain();
  });

  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  describe('Test deployments', () => {
    it.skip('generates and deploys the `BettingEvent` smart contract', async () => {
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

      const bettingEventInstance = new BettingEvent(eventAddress);

      // Verify initial storage
      expect(bettingEventInstance.betsAgainst.get().toString()).toEqual('0');
      expect(bettingEventInstance.betsFor.get().toString()).toEqual('0');
      expect(bettingEventInstance.result.get().toString()).toEqual('0');
      expect(bettingEventInstance.mapRoot.get().toString()).not.toEqual('0');
    });
  });

  describe('BettingEvent()', () => {
    let merkleMapValues: Record<string, any>;
    let bettingEventInstance: BettingEvent;

    beforeEach(async () => {
      await isReady;
      deployerPrivateKey = createLocalBlockchain();
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
      } = await deployAllContracts(
        deployerPrivateKey,
        startTimestamp,
        endTimestamp,
        eventDescription
      );
      merkleMapValues = {
        BET_FOR_TOKEN_KEY: tokenForAddress.toBase58(),
        BET_AGAINST_TOKEN_KEY: tokenAgainstAddress.toBase58(),
        ORACLE_KEY: oracleAddress.toBase58(),
        START_KEY: startTimestamp,
        END_KEY: endTimestamp,
        DESCRIPTION_KEY: eventDescription,
      };

      bettingEventInstance = new BettingEvent(eventAddress);
    });

    it('call bet with valid preconditions and parameters', async () => {
      // Prepare params
      let user = deployerPrivateKey.toPublicKey();
      let amount = new UInt64(0.1e9);
      let side = true;
      let tokenPk = merkleMapValues.BET_FOR_TOKEN_KEY;
      let start = merkleMapValues.START_KEY;

      // Get map
      const map = prepareMap(merkleMapValues);

      // Get witnesses
      const tokenPublicKey = PublicKey.fromBase58(tokenPk);
      const startUInt64 = UInt64.from(start);

      let tokenWitness = map.getWitness(bettingEventInstance.BET_FOR_TOKEN_KEY);
      let startWitness = map.getWitness(bettingEventInstance.START_KEY);

      let transaction = await Mina.transaction(
        { sender: user, fee: 0.1e9 },
        () => {
          AccountUpdate.fundNewAccount(user);
          bettingEventInstance.bet(
            user,
            amount,
            Bool(side),
            tokenWitness,
            tokenPublicKey,
            startWitness,
            startUInt64
          );
        }
      );
      await transaction.sign([deployerPrivateKey]).prove();

      console.log('Sending the transaction..');
      let pendingTx = await transaction.send();
      console.log(pendingTx.hash());

      // Verify storage
    });
  });
});
