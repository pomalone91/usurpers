export enum Role {
    NONE =      "NONE",
    MONARCH =   "MONARCH",
    BODY_GUARD ="BODY GUARD",
    ASSASSIN =  "ASSASSIN",
    USURPER =   "USURPER"
};

interface Player {
    userId: string;
    role: Role;
    alive: boolean;
}
export type { Player };

export function assign_roles(game: Player[]) {
    var players_list: Player[] = game;
    /** 
        * Add number of roles based on how many players there are. Minimum is 5. 
        * 5 Players: 1x Monarch, 1x Bodyguard, 2x Assassins, 1x Usurper
        * 6 Players: 1x Monarch, 1x Bodyguard, 3x Assassins, 1x Usurper
        * 7 Players: 1x Monarch, 2x Bodyguard, 3x Assassins, 1x Usurper
        * 8 Players: 1x Monarch, 2x Bodyguard, 4x Assassins, 1x Usurper
    */
    const number_of_assassins = game.length / 2;
    const number_of_body_guards = number_of_assassins - 2 + game.length % 2;

    const assignable_roles: Role[] = [];
    // Monarch and Usurper is always 1
    assignable_roles.push(Role.MONARCH);
    assignable_roles.push(Role.USURPER);
    // Assassins
    for (var i = 0; i < number_of_assassins - 1; i++) {
        assignable_roles.push(Role.ASSASSIN);
    }
    // Body Guards
    for (var i = 0; i < number_of_body_guards - 1; i++) {
        assignable_roles.push(Role.BODY_GUARD);
    }

    // Shuffle the array of roles
    let shuffled = assignable_roles
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);

    // Assign the roles to each player
    for (var i = 0; i < players_list.length; i++) {
        players_list[i].role = shuffled[i];
    }

    return players_list;
}
