// Copyright 2020-2022 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: Apache-2.0

import bs58 from 'bs58';
import { BigNumber } from '@ethersproject/bignumber';
import { EraManager } from '@subql/contract-sdk';
import { Delegator, Indexer, EraValue, JSONBigInt } from '../types';
import testnetAddresses from '@subql/contract-sdk/publish/testnet.json';
import {
  SEASON_2_END,
  INDEXER_CHALLENGE_PTS,
  INDEXER_CHALLENGE_DETAILS,
  DELEGATOR_CHALLENGE_PTS,
  DELEGATOR_CHALLENGE_DETAILS,
} from './constants';

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
      singleChallengePts: 0,
      singleChallenges: [],
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

export async function updateIndexerChallenges(
  indexerAddress: string,
  challengeType: string,
  blockHeight: number,
  blockTimestamp: Date
): Promise<void> {
  if (blockHeight >= SEASON_2_END) {
    logger.info('season 2 has ended');
    return;
  }

  const indexerRecord = await Indexer.get(indexerAddress);

  if (!indexerRecord) {
    logger.warn(
      `cannot find indexer to add challenge: ${indexerAddress}, ${challengeType}`
    );
    return;
  }

  const result = indexerRecord.singleChallenges.findIndex(
    ({ title }) => title === challengeType
  );

  if (result === -1) {
    const length = indexerRecord.singleChallenges.push({
      title: challengeType,
      points: INDEXER_CHALLENGE_PTS[challengeType],
      details: INDEXER_CHALLENGE_DETAILS[challengeType],
      timestamp: blockTimestamp,
    });

    indexerRecord.singleChallengePts +=
      indexerRecord.singleChallenges[length - 1].points;
  }

  logger.info(
    `updateIndexerChallenges: ${indexerAddress}, ${challengeType}, ${result}, ${JSON.stringify(
      indexerRecord.singleChallenges
    )}`
  );

  await indexerRecord.save();
}

export async function updateDelegatorChallenges(
  delegatorAddress: string,
  challengeType: string,
  blockHeight: number,
  blockTimestamp: Date
): Promise<void> {
  if (blockHeight >= SEASON_2_END) {
    logger.info('season 2 has ended');
    return;
  }

  const delegatorRecord = await Delegator.get(delegatorAddress);

  logger.info(
    `updateDelegatorChallenges: ${delegatorAddress}, ${challengeType}, ${
      delegatorRecord ? 'true' : 'false'
    } `
  );

  if (!delegatorRecord) {
    logger.warn(
      `cannot find delegator to add challenge: ${delegatorAddress}, ${challengeType}`
    );
    return;
  }

  const result = delegatorRecord.singleChallenges.findIndex(
    ({ title }) => title === challengeType
  );

  if (result === -1) {
    const length = delegatorRecord.singleChallenges.push({
      title: challengeType,
      points: DELEGATOR_CHALLENGE_PTS[challengeType],
      details: DELEGATOR_CHALLENGE_DETAILS[challengeType],
      timestamp: blockTimestamp,
    });

    delegatorRecord.singleChallengePts +=
      delegatorRecord.singleChallenges[length - 1].points;
  }

  await delegatorRecord.save();
}
