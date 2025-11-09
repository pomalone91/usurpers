CREATE TABLE games (
    game_id integer CONSTRAINT firstkey PRIMARY KEY,
    host_id integer NOT NULL,
    created_on date NOT NULL,
    -- 0. Recruiting
    -- 1. Begun
    -- 2. Concluded
    status integer
);


