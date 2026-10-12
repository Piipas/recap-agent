import { CommitsCollector } from "./src/helpers/commit-collector.js";

const main = async () => {
  console.log("Recap Agent!");

  console.log("Collecting commits from GitHub...");
  const commits = await CommitsCollector();
  console.log(commits);
};

main();
