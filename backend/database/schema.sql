-- WHALE Database Schema for PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Facilities table
CREATE TABLE facilities (
    id SERIAL PRIMARY KEY,
    facility_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    postal_code VARCHAR(10),
    address VARCHAR(500),
    phone VARCHAR(20),
    founded_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_facilities_facility_id ON facilities(facility_id);
CREATE INDEX idx_facilities_status ON facilities(status);

-- Admins table
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    admin_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_kana VARCHAR(255),
    email VARCHAR(255),
    postal_code VARCHAR(10),
    address VARCHAR(500),
    phone VARCHAR(20),
    birthdate DATE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(facility_id, admin_id)
);

CREATE INDEX idx_admins_facility_id ON admins(facility_id);
CREATE INDEX idx_admins_admin_id ON admins(admin_id);
CREATE INDEX idx_admins_status ON admins(status);

-- Staff table
CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    staff_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_kana VARCHAR(255),
    email VARCHAR(255),
    postal_code VARCHAR(10),
    address VARCHAR(500),
    phone VARCHAR(20),
    birthdate DATE,
    hire_date DATE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'staff',
    qualifications TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(facility_id, staff_id)
);

CREATE INDEX idx_staff_facility_id ON staff(facility_id);
CREATE INDEX idx_staff_staff_id ON staff(staff_id);
CREATE INDEX idx_staff_status ON staff(status);

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_kana VARCHAR(255),
    email VARCHAR(255),
    postal_code VARCHAR(10),
    address VARCHAR(500),
    phone VARCHAR(20),
    birthdate DATE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    guardian_name VARCHAR(255),
    guardian_phone VARCHAR(20),
    emergency_contact VARCHAR(500),
    medical_history TEXT,
    allergies TEXT,
    disabilities TEXT,
    support_level VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(facility_id, user_id)
);

CREATE INDEX idx_users_facility_id ON users(facility_id);
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_status ON users(status);

-- Daily records table
CREATE TABLE daily_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    wake_up_time TIME,
    sleep_time TIME,
    arrival_time TIME,
    departure_time TIME,
    breakfast BOOLEAN DEFAULT false,
    breakfast_appetite INTEGER DEFAULT 5,
    breakfast_content TEXT,
    lunch BOOLEAN DEFAULT false,
    lunch_appetite INTEGER DEFAULT 5,
    lunch_content TEXT,
    dinner BOOLEAN DEFAULT false,
    dinner_appetite INTEGER DEFAULT 5,
    dinner_content TEXT,
    meal_provided BOOLEAN DEFAULT false,
    exercise BOOLEAN DEFAULT false,
    exercise_type VARCHAR(255),
    exercise_duration INTEGER DEFAULT 0,
    steps INTEGER DEFAULT 0,
    bathing BOOLEAN DEFAULT false,
    bathing_time TIME,
    bathing_assistance VARCHAR(50),
    washing BOOLEAN DEFAULT false,
    tooth_brushing BOOLEAN DEFAULT false,
    morning_medication BOOLEAN DEFAULT false,
    morning_medication_list TEXT,
    morning_medication_time TIME,
    noon_medication BOOLEAN DEFAULT false,
    noon_medication_list TEXT,
    noon_medication_time TIME,
    evening_medication BOOLEAN DEFAULT false,
    evening_medication_list TEXT,
    evening_medication_time TIME,
    bedtime_medication BOOLEAN DEFAULT false,
    bedtime_medication_list TEXT,
    bedtime_medication_time TIME,
    pre_medication BOOLEAN DEFAULT false,
    pre_medication_reason TEXT,
    pre_medication_list TEXT,
    pre_medication_time TIME,
    body_temperature DECIMAL(4,1),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    pulse INTEGER,
    spo2 INTEGER,
    emotion_icon INTEGER DEFAULT 5,
    mood_score INTEGER DEFAULT 5,
    mood_detail TEXT,
    thoughts TEXT,
    feelings TEXT,
    worries TEXT,
    concerns TEXT,
    consultation TEXT,
    contact TEXT,
    report TEXT,
    chat TEXT,
    achievements TEXT,
    improvements TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_records_user_id ON daily_records(user_id);
CREATE INDEX idx_daily_records_date ON daily_records(date);
CREATE INDEX idx_daily_records_user_date ON daily_records(user_id, date);

-- Medications table
CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    start_date DATE,
    end_date DATE,
    prescribing_doctor VARCHAR(255),
    purpose TEXT,
    side_effects TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medications_user_id ON medications(user_id);
CREATE INDEX idx_medications_status ON medications(status);

-- Vital signs table
CREATE TABLE vital_signs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP NOT NULL,
    body_temperature DECIMAL(4,1),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    pulse INTEGER,
    spo2 INTEGER,
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    notes TEXT,
    recorded_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vital_signs_user_id ON vital_signs(user_id);
CREATE INDEX idx_vital_signs_recorded_at ON vital_signs(recorded_at);

-- Vital alerts table
CREATE TABLE vital_alerts (
    id SERIAL PRIMARY KEY,
    daily_record_id INTEGER REFERENCES daily_records(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vital_alerts_user_id ON vital_alerts(user_id);
CREATE INDEX idx_vital_alerts_is_resolved ON vital_alerts(is_resolved);

-- Assessments table
CREATE TABLE assessments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_date DATE NOT NULL,
    assessment_type VARCHAR(50),
    conducted_by INTEGER REFERENCES staff(id),
    current_situation TEXT,
    goals TEXT,
    support_needs TEXT,
    recommendations TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    approved_by INTEGER,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assessments_user_id ON assessments(user_id);
CREATE INDEX idx_assessments_status ON assessments(status);

-- Service plans table
CREATE TABLE service_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_start_date DATE NOT NULL,
    plan_end_date DATE NOT NULL,
    created_by INTEGER REFERENCES staff(id),
    objectives TEXT,
    services TEXT,
    schedule TEXT,
    responsible_staff TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    approved_by INTEGER,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_service_plans_user_id ON service_plans(user_id);
CREATE INDEX idx_service_plans_status ON service_plans(status);

-- Support records table
CREATE TABLE support_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    staff_id INTEGER REFERENCES staff(id),
    support_type VARCHAR(100),
    content TEXT,
    outcomes TEXT,
    follow_up TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_records_user_id ON support_records(user_id);
CREATE INDEX idx_support_records_date ON support_records(record_date);

-- Physical restraint and abuse records table
CREATE TABLE restraint_abuse_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    incident_date TIMESTAMP NOT NULL,
    incident_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    staff_involved TEXT,
    witnesses TEXT,
    immediate_actions TEXT,
    prevention_measures TEXT,
    reported_to VARCHAR(255),
    reported_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'reported',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_restraint_abuse_records_user_id ON restraint_abuse_records(user_id);
CREATE INDEX idx_restraint_abuse_records_incident_date ON restraint_abuse_records(incident_date);

-- Attendance records table
CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    arrival_time TIME,
    departure_time TIME,
    status VARCHAR(20) DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, attendance_date)
);

CREATE INDEX idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(attendance_date);

-- Staff schedules table
CREATE TABLE staff_schedules (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    schedule_date DATE NOT NULL,
    shift_start TIME,
    shift_end TIME,
    shift_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, schedule_date)
);

CREATE INDEX idx_staff_schedules_staff_id ON staff_schedules(staff_id);
CREATE INDEX idx_staff_schedules_date ON staff_schedules(schedule_date);

-- Sessions table
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(20) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id, user_type);

-- Access logs table
CREATE TABLE access_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_type VARCHAR(20),
    action VARCHAR(100) NOT NULL,
    target_id INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_access_logs_user ON access_logs(user_id, user_type);
CREATE INDEX idx_access_logs_action ON access_logs(action);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON facilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_records_updated_at BEFORE UPDATE ON daily_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON medications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_plans_updated_at BEFORE UPDATE ON service_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_records_updated_at BEFORE UPDATE ON support_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restraint_abuse_records_updated_at BEFORE UPDATE ON restraint_abuse_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_schedules_updated_at BEFORE UPDATE ON staff_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
