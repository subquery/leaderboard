// Copyright 2020-2022 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { FrontierEvmEvent } from '@subql/contract-processors/dist/frontierEvm';
import { PlanCreatedEvent } from '@subql/contract-sdk/typechain/PlanManager';
import { updateIndexerChallenges } from './utils';
import { constants } from 'ethers';

import assert from 'assert';

export async function handlePlanCreated(
  event: FrontierEvmEvent<PlanCreatedEvent['args']>
): Promise<void> {
  logger.info('handlePlanCreated');
  assert(event.args, 'No event args');

  const { creator, deploymentId } = event.args;
  const challengeType =
    constants.HashZero === deploymentId
      ? 'CREATE_DEFAULT_PLAN'
      : 'CREATE_SPECIFIC_PLAN';

  await updateIndexerChallenges(
    creator,
    challengeType,
    event.blockNumber,
    event.blockTimestamp
  );
}
