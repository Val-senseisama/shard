
import Session from './Session';
import { jwtDecode } from "jwt-decode";


export const isLoggedIn = async () => {
    const token = await Session.getCookie('x-access-token');
 
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
    } catch (err) {
        return false;
    }
    
    return true;
};
