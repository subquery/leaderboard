// Copyright 2020-2022 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: Apache-2.0

import bs58 from 'bs58';
import { rolesConfig, RoleType, SEASON_2_END } from './constants';

export function bytesToIpfsCid(raw: string): string {
  // Add our default ipfs values for first 2 bytes:
  // function:0x12=sha2, size:0x20=256 bits
  // and cut off leading "0x"
  const hashHex = '1220' + raw.slice(2);
  const hashBytes = Buffer.from(hashHex, 'hex');
  return bs58.encode(hashBytes);
}

async function updateChallenge(
  address: string,
  type: string,
  blockHeight: number,
  blockTimestamp: Date,
  roleType: RoleType
) {
  if (blockHeight >= SEASON_2_END) {
    logger.info('season 2 has ended');
    return;
  }

  const { name, entity, pts, details } = rolesConfig[roleType];
  let role = await entity.get(address);

  logger.info(`update${name}Challenges: ${address}`);
  if (!role) {
    logger.warn(`Add new ${name}: ${address}`);
    role = entity.create({
      id: address,
      singleChallengePts: 0,
      singleChallenges: [],
    });
  }

  const result = role.singleChallenges.findIndex(({ title }) => title === type);

  if (result === -1) {
    const length = role.singleChallenges.push({
      title: type,
      points: pts[type],
      details: details[type],
      timestamp: blockTimestamp,
    });

    role.singleChallengePts += role.singleChallenges[length - 1].points;
  }

  await role.save();
}

export async function updateIndexerChallenges(
  indexer: string,
  type: string,
  blockHeight: number,
  blockTimestamp: Date
): Promise<void> {
  await updateChallenge(
    indexer,
    type,
    blockHeight,
    blockTimestamp,
    RoleType.Indexer
  );
}

export async function updateDelegatorChallenges(
  delegator: string,
  type: string,
  blockHeight: number,
  blockTimestamp: Date
): Promise<void> {
  await updateChallenge(
    delegator,
    type,
    blockHeight,
    blockTimestamp,
    RoleType.Delegator
  );
}
