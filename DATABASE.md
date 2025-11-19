psql 'postgresql://neondb_owner:npg_IvfLlwb8pq0C@ep-old-field-ae4j43oh-pooler.c-2.us-east-2.aws.neon.tech/weaveit?sslmode=require&channel_binding=require'

✅ Minimal Schema Without Scripts Table

Here is the PostgreSQL schema without storing scripts, only storing job info, video outputs + temporary script inside the job record:

-- USERS
CREATE TABLE users (
wallet_address TEXT PRIMARY KEY,
prompt_points INTEGER NOT NULL DEFAULT 0,
created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- VIDEO GENERATION JOBS (script is stored temporarily in this row)
CREATE TABLE video_jobs (
job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,

    script_body    TEXT NOT NULL,   -- temporary, can be deleted after success
    status         TEXT NOT NULL DEFAULT 'pending',
        -- pending | generating | failed | completed

    error_message  TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW()

);

-- FINAL VIDEOS
CREATE TABLE videos (
video_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
job_id UUID NOT NULL REFERENCES video_jobs(job_id) ON DELETE CASCADE,
wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,

    video_data     BYTEA NOT NULL,   -- or store external link in video_url
    duration_sec   INTEGER,
    format         TEXT DEFAULT 'mp4',
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()

);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = NOW();
RETURN NEW;
END;

$$
LANGUAGE plpgsql;

CREATE TRIGGER video_jobs_update_time
BEFORE UPDATE ON video_jobs
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

🧠 Optional Optimization (Recommended)

After a job finishes successfully, you can automatically delete script_body to save space:

UPDATE video_jobs
SET script_body = NULL
WHERE job_id = '<job_id>';


Or delete failed jobs older than X days:

DELETE FROM video_jobs
WHERE status = 'failed' AND created_at < NOW() - INTERVAL '7 days';
$$
