import { Vector3 } from "@babylonjs/core";
import { useTerrain } from "../../data-hooks/useTerrain";
import { Terrain } from "../renderables/Terrain";

const chunk = { x: 0, z: 0 };
const renderDistance = 2;

export const World = () => {

    const terrainData = useTerrain(chunk, renderDistance);

    return <>
        <arcRotateCamera name="camera1" target={new Vector3(0, 10, 0)} alpha={0} beta={0} radius={10} wheelPrecision={100} panningSensibility={100} />
        <hemisphericLight name="HemisphericLight" intensity={0.7} direction={new Vector3(0, 1, 0)} />
        <box name="box1" size={1} position={new Vector3(0, 0, 0)} />
        <Terrain chunk={chunk} renderDistance={2} terrainData={terrainData} chunkSize={50} />
    </>
}