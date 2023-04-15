import { Field, Mina, PrivateKey, shutdown } from 'snarkyjs';
import fs from 'fs/promises';
import { BettingEvent } from './BettingEvent.js';
import { Token } from './Token.js';
import { Oracle } from './Oracle.js';
import { deployAllContracts } from './utils.js';

// check command line arg
let network = process.argv[2];
if (!network)
  throw Error(`Missing <network> argument.
Usage:
node build/src/deploy.js <network>
Example:
node build/src/deploy.js testnet
`);
Error.stackTraceLimit = 1000;

// parse config and private key from file
type Config = {
  deployAliases: Record<string, { url: string; keyPath: string }>;
};
let configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
let config = configJson.deployAliases[network];
let key: { privateKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);

// set up Mina instance and contract we interact with
const Network = Mina.Network(config.url);
Mina.setActiveInstance(Network);

// compile the contract to create prover keys

async function main() {
  let deployerPrivateKey = PrivateKey.fromBase58(key.privateKey);
  const startLag = 1000 * 60 * 10;
  const duration = 1000 * 60 * 60 * 5;
  const startTimestamp = Date.now() + startLag;
  const endTimestamp = startTimestamp + duration;
  const eventDescription = 'Beastcost will win the ESL Championship';

  const { eventAddress, tokenForAddress, tokenAgainstAddress, oracleAddress } =
    await deployAllContracts(
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
  console.log(eventAddress.toBase58());
  console.log(merkleMapValues);
}

main().then(() => shutdown());
