export const calculateDBAndBuild = (str, siz) => {
    const total = str + siz;
    if (total <= 64) return { db: '-2', build: -2 };
    if (total <= 84) return { db: '-1', build: -1 };
    if (total <= 124) return { db: '+0', build: 0 };
    if (total <= 164) return { db: '+1D4', build: 1 };
    if (total <= 204) return { db: '+1D6', build: 2 };
    if (total <= 284) return { db: '+2D6', build: 3 };
    return { db: '+3D6', build: 4 };
};

export const calculateMoveRate = (str, dex, siz, age) => {
    let moveRate = 8;
    if (str < siz && dex < siz) moveRate = 7;
    else if (str > siz && dex > siz) moveRate = 9;
    
    if (age >= 80) moveRate -= 5;
    else if (age >= 70) moveRate -= 4;
    else if (age >= 60) moveRate -= 3;
    else if (age >= 50) moveRate -= 2;
    else if (age >= 40) moveRate -= 1;
    
    return moveRate;
};
