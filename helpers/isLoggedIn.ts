
import Session from './Session';
import { jwtDecode } from "jwt-decode";
import { User, useUserStore } from "../store/user.store";


export const isLoggedIn = async () => {
    const token = await Session.getCookie('x-access-token');
    const setUser = useUserStore.getState().setUser;

    if (!token) {
        return false;
    }
    try {
        const decoded: Record<string, any> = jwtDecode(token);
        console.log("decoded", decoded);

        const isExpired = decoded.exp <= Math.floor(Date.now() / 1000);
        if (isExpired || !decoded.id) {
            return false;
        }
        setUser(decoded as User);
    } catch (err) {
        return false;
    }

    return true;
};
