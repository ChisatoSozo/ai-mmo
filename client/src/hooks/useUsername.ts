import { useMemo } from "react";

export const useUsername = () => {
    const username = useMemo(() => localStorage.getItem('username'), []);
    return username;
}