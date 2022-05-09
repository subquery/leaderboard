import bs58 from 'bs58';
import { BigNumber } from '@ethersproject/bignumber';
import { EraManager } from '@subql/contract-sdk';
import { Delegator, Indexer, EraValue, JSONBigInt } from '../types';
import testnetAddresses from '@subql/contract-sdk/publish/testnet.json';

interface Challenge_Pts {
  [key: string]: number;
}
interface Challenge_Details {
  [key: string]: string;
}

// One off challenges to complete
export const CHALLENGES_PTS: Challenge_Pts = {
  INDEX_SINGLE: 10,
  INDEX_ALL: 50,
  ATTRACT_DELEGATOR: 20,
  CHANGE_COMMISSION: 10,
  DEFAULT_PLAN: 50,
  OVERRIDE_PLAN: 50,
  SERVICE_AGREEMENT: 50,
  //new challenges
  CLAIM_REWARD: 20,
  INDEXER_UNDELEGATED: 20,
  WITHDRAW_CLAIMED: 50,
};

//TODO: DELEGATOR CHALLENGES
//CLAIM_REWARD: 20,
//WITHDRAW_CLAIMED: 50,
//REDELEGATE_INDEXER: 50,
//UNDELEGATE_INDEXER: 50

export const CHALLENGES_DETAILS: Challenge_Details = {
  INDEX_SINGLE: 'Fully index a project from demo projects list',
  INDEX_ALL: 'Index all projects from demo projects list',
  ATTRACT_DELEGATOR: 'Attract your first delegator',
  CHANGE_COMMISSION: 'Either increase of decrease commission rate',
  DEFAULT_PLAN: 'Create a default plan',
  OVERRIDE_PLAN: 'Create a override plan',
  SERVICE_AGREEMENT: 'Create a service aggreement',
  //new challenges
  CLAIM_REWARD: 'Indexer claims a reward',
  INDEXER_UNDELEGATED: 'Indexer remove delegation to itself',
  WITHDRAW_CLAIMED: 'Indexer withdraws unstaked amount',
};

// IPFS HASH of deployments
export const DEMO_PROJECTS = [
  'QmYR8xQgAXuCXMPGPVxxR91L4VtKZsozCM7Qsa5oAbyaQ3', //Staking Threshold - Polkadot
  'QmSzPQ9f4U1GERvN1AxJ28xq9B5s4M72CPvotmmv1N2bN7', //Staking Threshold - Kusama
];

export const ERA_MANAGER_ADDRESS = testnetAddresses.EraManager.address;
export const PLAN_MANAGER_ADDRESS = testnetAddresses.PlanManager.address;
export const SA_REGISTRY_ADDRESS =
  testnetAddresses.ServiceAgreementRegistry.address;
export const REWARD_DIST_ADDRESS = testnetAddresses.RewardsDistributer.address;

declare global {
  interface BigIntConstructor {
    fromJSONType(value: unknown): bigint;
  }
  interface BigInt {
    toJSON(): string;
    toJSONType(): JSONBigInt;
    fromJSONType(value: unknown): bigint;
  }
}

BigInt.prototype.toJSON = function (): string {
  return BigNumber.from(this).toHexString();
};

BigInt.prototype.toJSONType = function () {
  return {
    type: 'bigint',
    value: this.toJSON(),
  };
};

BigInt.fromJSONType = function (value: JSONBigInt): bigint {
  if (value?.type !== 'bigint' && !value.value) {
    throw new Error('Value is not JSOBigInt');
  }

  return BigNumber.from(value.value).toBigInt();
};

export function bytesToIpfsCid(raw: string): string {
  // Add our default ipfs values for first 2 bytes:
  // function:0x12=sha2, size:0x20=256 bits
  // and cut off leading "0x"
  const hashHex = '1220' + raw.slice(2);
  const hashBytes = Buffer.from(hashHex, 'hex');
  return bs58.encode(hashBytes);
}

export function bnToDate(bn: BigNumber): Date {
  return new Date(bn.toNumber() * 1000);
}

export const operations: Record<string, (a: bigint, b: bigint) => bigint> = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  replace: (a, b) => b,
};

export async function upsertEraValue(
  eraManager: EraManager,
  eraValue: EraValue | undefined,
  value: bigint,
  operation: keyof typeof operations = 'add',
  applyInstantly?: boolean
): Promise<EraValue> {
  const currentEra = await eraManager.eraNumber().then((r) => r.toNumber());

  if (!eraValue) {
    return {
      era: currentEra,
      value: (applyInstantly ? value : BigInt(0)).toJSONType(),
      valueAfter: value.toJSONType(),
    };
  }

  const applyOperation = (existing: JSONBigInt) =>
    operations[operation](BigInt.fromJSONType(existing), value).toJSONType();

  const valueAfter = applyOperation(eraValue.valueAfter);

  if (eraValue.era === currentEra) {
    const newValue = applyInstantly
      ? applyOperation(eraValue.value)
      : eraValue.value;

    return {
      era: currentEra,
      value: newValue,
      valueAfter,
    };
  }

  const newValue = applyInstantly
    ? applyOperation(eraValue.valueAfter)
    : eraValue.valueAfter;

  return {
    era: currentEra,
    value: newValue,
    valueAfter,
  };
}

export async function updateTotalStake(
  eraManager: EraManager,
  indexerAddress: string,
  amount: bigint,
  operation: keyof typeof operations,
  applyInstantly?: boolean
): Promise<void> {
  let indexer = await Indexer.get(indexerAddress);

  if (!indexer) {
    indexer = Indexer.create({
      id: indexerAddress,
      totalStake: await upsertEraValue(
        eraManager,
        undefined,
        amount,
        operation,
        applyInstantly
      ),
      commission: await upsertEraValue(
        eraManager,
        undefined,
        BigInt(0),
        operation,
        applyInstantly
      ),
      singleChallengePts: 0,
      demoProjectsIndexed: [],
      singleChallenges: [],
    });
  } else {
    indexer.totalStake = await upsertEraValue(
      eraManager,
      indexer.totalStake,
      amount,
      operation,
      applyInstantly
    );
  }

  await indexer.save();
}

export async function updateTotalDelegation(
  eraManager: EraManager,
  delegatorAddress: string,
  amount: bigint,
  operation: keyof typeof operations = 'add',
  applyInstantly?: boolean
): Promise<void> {
  let delegator = await Delegator.get(delegatorAddress);

  if (!delegator) {
    delegator = Delegator.create({
      id: delegatorAddress,
      totalDelegations: await upsertEraValue(
        eraManager,
        undefined,
        amount,
        operation,
        applyInstantly
      ),
    });
  } else {
    delegator.totalDelegations = await upsertEraValue(
      eraManager,
      delegator.totalDelegations,
      amount,
      operation,
      applyInstantly
    );
  }

  await delegator.save();
}

export async function updateChallengeStatus(
  indexerAddress: string,
  challengeType: string
): Promise<void> {
  const indexerRecord = await Indexer.get(indexerAddress);

  logger.info(`updateChallengeStatus: ${indexerAddress}, ${challengeType} `);

  if (!indexerRecord) {
    logger.warn(`cannot find indexer to add challenge`);
    return;
  }

  const result = indexerRecord.singleChallenges.findIndex(
    ({ title }) => title === challengeType
  );

  if (result === -1) {
    const length = indexerRecord.singleChallenges.push({
      title: challengeType,
      points: CHALLENGES_PTS[challengeType],
      details: CHALLENGES_DETAILS[challengeType],
    });

    indexerRecord.singleChallengePts +=
      indexerRecord.singleChallenges[length - 1].points;
  }

  await indexerRecord.save();
}
