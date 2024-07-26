const { ethers, network } = require("hardhat");
const { encryptDataField } = require("@swisstronik/utils");
const fs = require("fs");
const path = require("path");
const deployedAddress = "0x31524C2a2e0ef09f666F18aCF41e2D9bdCCA6e51";

const sendShieldedTransaction = async (signer, destination, data, value) => {
  const rpclink = network.config.url;

  const [encryptedData] = await encryptDataField(rpclink, data);

  return await signer.sendTransaction({
    from: signer.address,
    to: destination,
    data: encryptedData,
    value,
  });
};

async function main() {
  const contractAddress = deployedAddress;

  const [signer] = await ethers.getSigners();

  const contractFactory = await ethers.getContractFactory("MyNFT");
  const contract = contractFactory.attach(contractAddress);

  const mintFunctionName = "mintNFT";
  const recipientAddress = signer.address;

  const mintTx = await sendShieldedTransaction(
    signer,
    contractAddress,
    contract.interface.encodeFunctionData(mintFunctionName, [recipientAddress]),
    0
  );
  const mintReceipt = await mintTx.wait();
  console.log("Mint Transaction Hash: ", mintTx.hash);

  const mintEvent = mintReceipt.logs
    .map((log) => {
      try {
        return contract.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    })
    .find((event) => event && event.name === "NFTMinted");
  const tokenId = mintEvent?.args?.tokenId;
  console.log("Minted NFT ID: ", tokenId.toString());

  const filePath = path.join(__dirname, "../utils/tx-hash.txt");
  fs.writeFileSync(
    filePath,
    `NFT ID ${tokenId} : https://explorer-evm.testnet.swisstronik.com/tx/${mintTx.hash}\n`,
    {
      flag: "a",
    }
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
