export function createMarkId(){
    return `reg_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}