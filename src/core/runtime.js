import {get} from 'lodash'
import {
  Crypto
} from 'tesrasdk-ts';


import {
  getClient
} from './network';


export async function getBalance(addr) {
    let address = new Crypto.Address(addr);

  const client = getClient();
  const response = await client.getBalance(address);
  const tst = Number(get(response, 'Result.tst'));
  const tsg = Number(get(response, 'Result.tsg'));

  return {
    tsg,
    tst,
  };
}

export async function getUnboundTsg(addr) {
    let address = new Crypto.Address(addr);

  const client = getClient();
  const response = await client.getUnboundtsg(address);
  const unboundTsg = Number(get(response, 'Result'));
  return unboundTsg;
}

export async function getGrantTsg(addr) {
    let address = new Crypto.Address(addr);
    const client = getClient();
    const response = await client.getGrantTsg(address);
    const grantTsg = Number(get(response, 'Result'));
    return grantTsg;
}

export async function invokeTx(tx) {
    const client = getClient();
    await client.sendRawTransaction(tx.serialize(), false, true);
}

export async function invokeReadTx(tx) {
    const client = getClient();
    await client.sendRawTransaction(tx.serialize(), true, true);
}