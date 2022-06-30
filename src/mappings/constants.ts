// Copyright 2020-2022 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Delegator, Indexer } from '../types';

interface Challenge_Pts {
  [key: string]: number;
}

interface Challenge_Details {
  [key: string]: string;
}

export const SEASON_2_END = 340176;

export const INDEXER_CHALLENGE_PTS: Challenge_Pts = {
  INDEX_SINGLE_PROJECT: 10,
  INDEX_ALL_PROJECTS: 200,
  DELEGATOR_ATTRACTED: 20,
  CHANGE_COMMISSION: 10,
  CREATE_DEFAULT_PLAN: 50,
  CREATE_SPECIFIC_PLAN: 50,
  SERVICE_AGREEMENT_CREATED: 50,
  CLAIM_REWARD: 20,
  WITHDRAW_UNSTAKED: 50,
  INDEXER_UNDELEGATED: 20,
  UNREGISTER_INDEXER: 30,
};

export const INDEXER_CHALLENGE_DETAILS: Challenge_Details = {
  INDEX_SINGLE_PROJECT: 'Fully index a project from projects list',
  INDEX_ALL_PROJECTS: 'Index all projects from projects list',
  DELEGATOR_ATTRACTED: 'Get your first delegator',
  CHANGE_COMMISSION: 'Either increase of decrease commission rate',
  CREATE_DEFAULT_PLAN: 'Create a default plan',
  CREATE_SPECIFIC_PLAN: 'Create a deployment-specific plan',
  SERVICE_AGREEMENT_CREATED: 'Get a service agreement from consumer',
  CLAIM_REWARD:
    "Indexer claims a reward from reward distributor to an indexer's wallet",
  WITHDRAW_UNSTAKED:
    "Indexer withdraws unstaked amount from staking contract to an indexer's wallet",
  INDEXER_UNDELEGATED: 'Indexer gets undelegated from delegator',
  UNREGISTER_INDEXER: 'Unregister your indexer',
};

export const DELEGATOR_CHALLENGE_PTS: Challenge_Pts = {
  CLAIM_REWARD: 20,
  WITHDRAW_DELEGATION: 50,
  UNDELEGATE_FROM_INDEXER: 50,
};

export const DELEGATOR_CHALLENGE_DETAILS: Challenge_Details = {
  CLAIM_REWARD:
    "Delegator claims a reward from reward distributor to delegator's wallet",
  WITHDRAW_DELEGATION: 'Delegator withdraws undelegated amount from an indexer',
  UNDELEGATE_FROM_INDEXER: 'Delegator undelegate from an indexer',
};

export const DEMO_PROJECTS = [
  'QmYR8xQgAXuCXMPGPVxxR91L4VtKZsozCM7Qsa5oAbyaQ3', //Staking Threshold - Polkadot
  'QmSzPQ9f4U1GERvN1AxJ28xq9B5s4M72CPvotmmv1N2bN7', //Staking Threshold - Kusama
];

export type Role = Indexer | Delegator;

export enum RoleType {
  Indexer,
  Delegator,
  Consumer,
}

export const rolesConfig = {
  [RoleType.Indexer]: {
    name: 'Indexer',
    entity: Indexer,
    pts: INDEXER_CHALLENGE_PTS,
    details: INDEXER_CHALLENGE_DETAILS,
  },
  [RoleType.Delegator]: {
    name: 'Delegator',
    entity: Delegator,
    pts: DELEGATOR_CHALLENGE_PTS,
    details: DELEGATOR_CHALLENGE_DETAILS,
  },
};
