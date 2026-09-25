const MIN_LOG_RANGE = 10

export async function queryFilterInChunks(contract, filter, fromBlock, toBlock) {
  try {
    return await contract.queryFilter(filter, fromBlock, toBlock)
  } catch (err) {
    if (toBlock - fromBlock + 1 <= MIN_LOG_RANGE) {
      throw err
    }
    const middle = Math.floor((fromBlock + toBlock) / 2)
    const firstHalf = await queryFilterInChunks(contract, filter, fromBlock, middle)
    const secondHalf = await queryFilterInChunks(contract, filter, middle + 1, toBlock)
    return [...firstHalf, ...secondHalf]
  }
}
