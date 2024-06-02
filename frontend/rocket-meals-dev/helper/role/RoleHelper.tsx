import {DirectusRoles} from "@/helper/database/databaseTypes/types";

export class RoleHelper {

    static isAdmin(role: DirectusRoles | null){
        if(!role){
            return false;
        }
        return !!role?.admin_access;
    }

    static isEmployee(role: DirectusRoles){
        return role.name === "Mitarbeiter"
    }

}