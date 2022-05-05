// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { ServiceAgreementCreatedEvent } from '@subql/contract-sdk/typechain/ServiceAgreementRegistry';
import { Deployment, Indexer, ServiceAgreement } from '../types';
import { bytesToIpfsCid, updateChallengeStatus } from './utils';
import { IServiceAgreement__factory } from '@subql/contract-sdk';
import FrontierEthProvider from './ethProvider';
import { FrontierEvmEvent } from '@subql/contract-processors/dist/frontierEvm';

export async function handleServiceAgreementCreated(
  event: FrontierEvmEvent<ServiceAgreementCreatedEvent['args']>
): Promise<void> {
  logger.info('handleServiceAgreementCreated');
  assert(event.args, 'No event args');

  const saContract = IServiceAgreement__factory.connect(
    event.args.serviceAgreement,
    new FrontierEthProvider()
  );

  const [period, value] = await Promise.all([
    saContract.period(),
    saContract.value(),
  ]);

  const indexer = await Indexer.get(event.args.indexer);
  const deployment = await Deployment.get(
    bytesToIpfsCid(event.args.deploymentId)
  );

  const endTime = new Date(event.blockTimestamp);

  endTime.setSeconds(endTime.getSeconds() + period.toNumber());

  if (indexer && deployment) {
    const sa = ServiceAgreement.create({
      id: event.args.serviceAgreement,
      indexerAddress: event.args.indexer,
      consumerAddress: event.args.consumer,
      deploymentId: bytesToIpfsCid(event.args.deploymentId),
      period: period.toBigInt(),
      value: value.toBigInt(),
      startTime: event.blockTimestamp,
      endTime,
    });

    await sa.save();

    await updateChallengeStatus(event.args.indexer, 'SERVICE_AGREEMENT');
  } else {
    logger.info(
      `Either indexer (${event.args.indexer}) or deployment (${event.args.deploymentId}) dont exist`
    );
  }
}
