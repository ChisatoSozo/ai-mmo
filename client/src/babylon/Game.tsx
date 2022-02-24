import { Color3, Color4, Scene as BJSScene } from "@babylonjs/core";
import { useMemo } from "react";
import { Engine, Scene } from "react-babylonjs";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { globalObject } from "../utils/Global";
import { useWindowSize } from "./hooks/useWindowSize";
import { World } from "./scenes/World";

const skyColor = new Color4(0.95, 0.95, 1.0, 1.0);
const skyColor3 = new Color3(0.95, 0.95, 1.0);

export const Game = () => {
    const windowSize = useWindowSize();

    useMemo(() => {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("You are somehow here without a token");
        globalObject.token = token;
    }, []);

    return <Engine width={windowSize.width} height={windowSize.height} antialias canvasId="babylonJS">
        <Scene fogMode={BJSScene.FOGMODE_EXP2} fogDensity={0.0005} fogColor={skyColor3} ambientColor={skyColor3} clearColor={skyColor}>
            <Router>
                <Routes>
                    <Route path={`${process.env.PUBLIC_URL}/game`} element={<World />} />
                </Routes>
            </Router>
        </Scene>
    </Engine>
}