import { ClusterManager, ReClusterManager } from "discord-hybrid-sharding";
import { Token } from "./src/Structure/Configs/config";
const manager = new ClusterManager("./src/Structure/Configs/botConfig.js", {
  token: Token,
  totalShards: "auto",
  shardsPerClusters: 2,
  totalClusters: "auto",
  mode: "process",
});

manager.on("clusterCreate", (cluster) =>
  console.log(`Cluster launched : ${cluster.id}`)
);
manager.on("clusterDestroy", (cluster) =>
  console.log(`Cluster destroyed : ${cluster.id}`)
);
manager.spawn();