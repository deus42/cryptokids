import getConfig from '../config'
import * as nearAPI from 'near-api-js'
import { KeyPair } from 'near-api-js'

export const { networkId, nodeUrl, walletUrl, contractName } = getConfig(
  process.env.NODE_ENV || 'development'
)

let GAS = '200000000000000'
let contractMethods = {
  changeMethods: ['set_greeting'],
  viewMethods: ['get_greeting'],
}

const { Near, keyStores, Account, WalletAccount, Contract, InMemorySigner } =
  nearAPI

export const near = new Near({
  networkId,
  nodeUrl,
  walletUrl,
  deps: {
    keyStore: new keyStores.BrowserLocalStorageKeyStore(),
  },
})

// alias
export const contractId = contractName
export const marketId = 'market.' + contractName

export const setSignerFromSeed = async (
  accountId: string,
  seedPhrase: string
) => {
  const { secretKey } = parseSeedPhrase(seedPhrase)
  const keyPair = KeyPair.fromString(secretKey)
  near.connection.signer.keyStore.setKey(networkId, accountId, keyPair)
}
export function formatAccountId(accountId: string, len = 48) {
  if (accountId.length > len) {
    return accountId.substr(0, len - 3) + '...'
  }
  return accountId
}

export function getContract(
  account: nearAPI.Account,
  methods = contractMethods
) {
  return new Contract(account, contractName, { ...methods })
}

export const getWallet = async () => {
  const wallet = new WalletAccount(near, null)

  // walletAccount instance gets access key for contractId

  const contractAccount = new Account(near.connection, contractName)
  return { near, wallet, contractAccount }
}

export const getSignature = async (account: nearAPI.Account, _key: string) => {
  const { accountId } = account
  const block = await account.connection.provider.block({ finality: 'final' })
  const blockNumber = block.header.height.toString()
  const signer = account.inMemorySigner || account.connection.signer
  const signed = await signer.signMessage(
    Buffer.from(blockNumber),
    accountId,
    networkId
  )
  const blockNumberSignature = Buffer.from(signed.signature).toString('base64')
  return { blockNumber, blockNumberSignature }
}

export const postSignedJson = async ({
  account,
  contractName,
  url,
  data = {},
}) => {
  return await fetch(url, {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({
      ...data,
      accountId: account.accountId,
      contractName,
      ...(await getSignature(account)),
    }),
  }).then((res) => res.json())
}

export const postJson = async ({ url, data = {} }) => {
  return await fetch(url, {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({ ...data }),
  }).then((res) => res.json())
}

export const createGuestAccount = (near, key) => {
  key.toString = () => key.secretKey
  near.connection.signer.keyStore.setKey(
    networkId,
    'guests.' + contractName,
    key
  )
  const account = new Account(near.connection, 'guests.' + contractName)
  return account
}

export const createAccessKeyAccount = (near, key) => {
  key.toString = () => key.secretKey
  near.connection.signer.keyStore.setKey(networkId, contractName, key)
  const account = new Account(near.connection, contractName)
  return account
}

/********************************
Not used
********************************/

export const hasKey = async (near, accountId, publicKey) => {
  const pubKeyStr = publicKey.toString()
  const account = new nearAPI.Account(near.connection, accountId)
  try {
    const accessKeys = await account.getAccessKeys()
    if (
      accessKeys.length > 0 &&
      accessKeys.find(({ public_key }) => public_key === pubKeyStr)
    ) {
      return true
    }
  } catch (e) {
    console.warn(e)
  }
  return false
}

export const isAccountTaken = async (accountId: string) => {
  const account = new nearAPI.Account(near.connection, accountId)
  try {
    await account.state()
    return true
  } catch (e) {
    if (!/does not exist/.test(e.toString())) {
      throw e
    }
  }
  return false
}

export const getContractSigner = async ({ keyPair }) => {
  const signer = await InMemorySigner.fromKeyPair(
    networkId,
    contractName,
    keyPair
  )
  const near = await nearAPI.connect({
    networkId,
    nodeUrl,
    walletUrl,
    deps: { keyStore: signer.keyStore },
  })
  const account = new nearAPI.Account(near.connection, contractName)
  const contract = await new nearAPI.Contract(account, contractName, {
    changeMethods: ['send', 'claim', 'create_account_and_claim'],
    sender: account,
  })
  return { contract }
}
