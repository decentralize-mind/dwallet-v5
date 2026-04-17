const hre = require("hardhat");

async function main() {
  const AIRDROP_ADDR = "0xC8F1A0DbC619CDCe46fbD5d5067a11Dc4dC81c5c";
  const DWT = await hre.ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", "0xe149b32b97384131204C86a23459b544498BC46A");
  const bal = await DWT.balanceOf(AIRDROP_ADDR);
  console.log("Airdrop Address:", AIRDROP_ADDR);
  console.log("DWT Balance:", hre.ethers.formatEther(bal));
}

main().catch(console.error);
