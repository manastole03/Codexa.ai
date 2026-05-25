import { atom } from "recoil";

const localStorageEffect = key => ({ setSelf, onSet }) => {
    const savedValue = localStorage.getItem(key)
    if (savedValue != null) {
        setSelf(JSON.parse(savedValue));
    }

    onSet(newValue => {
        //   if (newValue instanceof DefaultValue) {
        //     localStorage.removeItem(key);
        //   } else {
        localStorage.setItem(key, JSON.stringify(newValue));
        //   }
    });
};

export const language = atom({
    key: "language",
    default: "javascript",
    effects_UNSTABLE: [
        localStorageEffect('language'),
    ]
});

export const cmtheme = atom({
    key: "cmtheme",
    default: "monokai",
    effects_UNSTABLE: [
        localStorageEffect('cmtheme'),
    ]
});

export const lcProblems = atom({
    key: "lcProblems",
    default: [],
    effects_UNSTABLE: [
        localStorageEffect('lcProblems'),
    ]
});

export const lcSelectedProblem = atom({
    key: "lcSelectedProblem",
    default: null,
    effects_UNSTABLE: [
        localStorageEffect('lcSelectedProblem'),
    ]
});

export const lcDrawerOpen = atom({
    key: "lcDrawerOpen",
    default: false,
    effects_UNSTABLE: [
        localStorageEffect('lcDrawerOpen'),
    ]
});
