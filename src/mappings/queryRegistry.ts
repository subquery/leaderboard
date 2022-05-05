// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {
  DeploymentIndexer,
  Indexer,
  Deployment,
  Project,
  Status,
} from '../types';

import {
  CreateQueryEvent,
  StartIndexingEvent,
  StopIndexingEvent,
  UpdateDeploymentStatusEvent,
  UpdateIndexingStatusToReadyEvent,
  UpdateQueryDeploymentEvent,
  UpdateQueryMetadataEvent,
} from '@subql/contract-sdk/typechain/QueryRegistry';

import {
  bnToDate,
  bytesToIpfsCid,
  DEMO_PROJECTS,
  updateChallengeStatus,
} from './utils';
import { FrontierEvmEvent } from '@subql/contract-processors/dist/frontierEvm';

function getDeploymentIndexerId(indexer: string, deploymentId: string): string {
  return `${indexer}:${deploymentId}`;
}

export async function handleNewQuery(
  event: FrontierEvmEvent<CreateQueryEvent['args']>
): Promise<void> {
  logger.info('handleNewQuery');
  assert(event.args, 'No event args');

  const projectId = event.args.queryId.toHexString();
  const deploymentId = bytesToIpfsCid(event.args.deploymentId);
  const currentVersion = bytesToIpfsCid(event.args.version);

  const project = Project.create({
    id: projectId,
    owner: event.args.creator,
    metadata: bytesToIpfsCid(event.args.metadata),
    currentDeployment: deploymentId,
    currentVersion,
    updatedTimestamp: event.blockTimestamp,
    createdTimestamp: event.blockTimestamp,
  });

  await project.save();

  const deployment = Deployment.create({
    id: deploymentId,
    version: currentVersion,
    createdTimestamp: event.blockTimestamp,
    projectId,
  });

  await deployment.save();
}

export async function handleUpdateQueryMetadata(
  event: FrontierEvmEvent<UpdateQueryMetadataEvent['args']>
): Promise<void> {
  logger.info('handleUpdateQueryMetadata');

  assert(event.args, 'No event args');
  const queryId = event.args.queryId.toHexString();
  const project = await Project.get(queryId);

  if (!project) {
    logger.warn(`Could not find project (${queryId})`);
    return;
  }

  project.metadata = bytesToIpfsCid(event.args.metadata);
  project.updatedTimestamp = event.blockTimestamp;

  await project.save();
}

export async function handleUpdateQueryDeployment(
  event: FrontierEvmEvent<UpdateQueryDeploymentEvent['args']>
): Promise<void> {
  logger.info('handleUpdateQueryDeployment');
  assert(event.args, 'No event args');
  const projectId = event.args.queryId.toHexString();
  const project = await Project.get(projectId);

  if (!project) {
    logger.warn(`Could not find project (${projectId})`);
    return;
  }

  const deploymentId = bytesToIpfsCid(event.args.deploymentId);
  const version = bytesToIpfsCid(event.args.version);

  const deployment = Deployment.create({
    id: deploymentId,
    version,
    createdTimestamp: event.blockTimestamp,
    projectId,
  });

  await deployment.save();

  project.currentDeployment = deploymentId;
  project.currentVersion = version;
  project.updatedTimestamp = event.blockTimestamp;

  await project.save();
}

export async function handleStartIndexing(
  event: FrontierEvmEvent<StartIndexingEvent['args']>
): Promise<void> {
  logger.info('handleStartIndexing');
  assert(event.args, 'No event args');
  const deploymentId = bytesToIpfsCid(event.args.deploymentId);

  const indexer = await Indexer.get(event.args.indexer);
  const deployment = await Deployment.get(
    bytesToIpfsCid(event.args.deploymentId)
  );

  if (indexer && deployment) {
    const deploymentIndexer = DeploymentIndexer.create({
      id: getDeploymentIndexerId(event.args.indexer, deploymentId),
      indexerId: event.args.indexer,
      deploymentId: deploymentId,
      blockHeight: BigInt(0),
      status: Status.INDEXING,
    });

    await deploymentIndexer.save();
  } else {
    logger.info(
      `Either indexer (${event.args.indexer}) or deployment (${deploymentId}) dont exist`
    );
  }
}

export async function handleIndexingUpdate(
  event: FrontierEvmEvent<UpdateDeploymentStatusEvent['args']>
): Promise<void> {
  // logger.info('handleIndexingUpdate');
  assert(event.args, 'No event args');
  const deploymentId = bytesToIpfsCid(event.args.deploymentId);
  const id = getDeploymentIndexerId(event.args.indexer, deploymentId);
  const indexer = await DeploymentIndexer.get(id);

  if (!indexer) {
    return;
  }
  indexer.blockHeight = event.args.blockheight.toBigInt();
  indexer.timestamp = bnToDate(event.args.timestamp);
  await indexer.save();
}

export async function handleIndexingReady(
  event: FrontierEvmEvent<UpdateIndexingStatusToReadyEvent['args']>
): Promise<void> {
  logger.info('handleIndexingReady');
  assert(event.args, 'No event args');
  const deploymentId = bytesToIpfsCid(event.args.deploymentId);
  const id = getDeploymentIndexerId(event.args.indexer, deploymentId);
  const deploymentIndexer = await DeploymentIndexer.get(id);

  if (!deploymentIndexer) {
    logger.warn(`deploymentIndexer: ${id} couldn't be found`);
    return;
  }

  deploymentIndexer.status = Status.READY;
  deploymentIndexer.timestamp = event.blockTimestamp;
  await deploymentIndexer.save();

  const indexer = await Indexer.get(deploymentIndexer.indexerId);

  if (indexer) {
    if (DEMO_PROJECTS.includes(deploymentId)) {
      await updateChallengeStatus(indexer.id, 'INDEX_SINGLE');
      if (!indexer.demoProjectsIndexed.includes(deploymentId)) {
        indexer.demoProjectsIndexed.push(deploymentId);
      }
    }

    if (indexer.demoProjectsIndexed.length === DEMO_PROJECTS.length) {
      await updateChallengeStatus(indexer.id, 'INDEX_ALL');
    }

    await indexer.save();
  }
}

export async function handleStopIndexing(
  event: FrontierEvmEvent<StopIndexingEvent['args']>
): Promise<void> {
  logger.info('handleStopIndexing');
  assert(event.args, 'No event args');
  const deploymentId = bytesToIpfsCid(event.args.deploymentId);
  const id = getDeploymentIndexerId(event.args.indexer, deploymentId);
  const indexer = await DeploymentIndexer.get(id);

  if (!indexer) {
    logger.warn(`deploymentIndexer: ${id} couldn't be found`);
    return;
  }

  indexer.status = Status.TERMINATED;
  await indexer.save();
}
