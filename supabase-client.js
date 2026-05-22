// supabase-client.js – central Supabase helper for Assignment‑board‑main
// Import the UMD bundle via CDN (works in plain <script type="module">)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 👉 Replace with your Supabase project credentials
const SUPABASE_URL = "https://vdceebtdfiysopihxcgr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkY2VlYnRkZml5c29waWh4Y2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzY2NjUsImV4cCI6MjA5NDg1MjY2NX0.PBRhvA19RFp5aG0ThJUjigaw_DZ-5H3jFLVnuUE9efg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Generic helper to fetch all rows from a table.
 * @param {string} table - Supabase table name.
 */
export async function fetchAll(table) {
  const { data, error } = await supabase.from(table).select();
  if (error) throw error;
  return data;
}

/**
 * Upsert a record (insert or update on conflict).
 * @param {string} table - Table name.
 * @param {object} row - Row object; must contain a primary‑key column (e.g., id).
 */
export async function upsertRow(table, row) {
  const { error } = await supabase.from(table).upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

/**
 * Delete a row by primary key.
 * @param {string} table - Table name.
 * @param {any} id - Primary key value.
 */
export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

/**
 * Generic helper to fetch a single record.
 */
export async function getRecord(table, column, value) {
  const { data, error } = await supabase.from(table).select().eq(column, value);
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

/**
 * Generic helper to upsert a record.
 */
export async function upsertRecord(table, record, conflictColumn = 'id') {
  const { data, error } = await supabase.from(table).upsert(record, { onConflict: conflictColumn }).select();
  if (error) throw error;
  return data;
}

/**
 * Generic helper to update a record.
 */
export async function updateRecord(table, column, value, updates) {
  const { data, error } = await supabase.from(table).update(updates).eq(column, value).select();
  if (error) throw error;
  return data;
}

/**
 * Fetch a document from classboard_kv.
 */
export async function getDoc(collection, docId) {
  const { data, error } = await supabase
    .from('classboard_kv')
    .select('data')
    .eq('collection', collection)
    .eq('doc_id', docId);
  if (error) throw error;
  return data && data.length > 0 ? data[0].data : null;
}

/**
 * Set a document in classboard_kv.
 */
export async function setDoc(collection, docId, docData) {
  const { error } = await supabase
    .from('classboard_kv')
    .upsert({ collection, doc_id: docId, data: docData }, { onConflict: 'collection,doc_id' });
  if (error) throw error;
}

/**
 * Update a document in classboard_kv (shallow merge).
 */
export async function updateDoc(collection, docId, updates) {
  const existing = await getDoc(collection, docId) || {};
  const merged = { ...existing, ...updates };
  await setDoc(collection, docId, merged);
}

/**
 * Delete a document from classboard_kv.
 */
export async function deleteDoc(collection, docId) {
  const { error } = await supabase
    .from('classboard_kv')
    .delete()
    .eq('collection', collection)
    .eq('doc_id', docId);
  if (error) throw error;
}

/**
 * Register a new student with required fields.
 * @param {object} param0 - Student data.
 * @param {string} param0.firstName - ชื่อ
 * @param {string} param0.lastName - นามสกุล
 * @param {string} param0.nickname - ชื่อเล่น
 * @param {string} param0.phone - เบอร์โทร (primary key)
 * @param {string} param0.classroom - ห้องเรียน
 */

export async function registerStudent({firstName, lastName, nickname, phone, classroom}) {
  const payload = {
    phone,
    first_name: firstName,
    last_name: lastName,
    nickname,
    classroom,
    created_at: new Date().toISOString()
  };
  const { error } = await supabase.from('students').upsert(payload, { onConflict: 'phone' });
  if (error) throw error;
}

/**
 * Bulk register multiple students efficiently.
 * @param {Array<object>} students - Array of student objects with same fields as registerStudent payload.
 */
export async function bulkRegisterStudents(students) {
  if (!Array.isArray(students) || students.length === 0) return;
  const { error } = await supabase.from('students').upsert(students, { onConflict: 'phone' });
  if (error) throw error;
}


/**
 * Retrieve a student record by phone.
 * @param {string} phone
 * @returns {object|null}
 */
export async function getStudentByPhone(phone) {
  const { data, error } = await supabase.from('students').select().eq('phone', phone).single();
  if (error && error.code !== 'PGRST116') throw error; // ignore not found
  return data || null;
}

/**
 * Upsert buddy information linked to a student.
 * @param {string} studentPhone - student's phone (foreign key)
 * @param {object} buddyInfo - {fullName, nickname, phone, photoUrl}
 */
export async function updateBuddyInfo(studentPhone, buddyInfo) {
  const payload = {
    student_phone: studentPhone,
    full_name: buddyInfo.fullName,
    nickname: buddyInfo.nickname,
    phone: buddyInfo.phone,
    photo_url: buddyInfo.photoUrl
  };
  const { error } = await supabase.from('buddies').upsert(payload, { onConflict: 'student_phone' });
  if (error) throw error;
}

/**
 * Upload a base64 image to Supabase Storage and return public URL.
 * @param {string} base64 - data URL
 * @param {string} path - storage path (e.g., "profile_photos/123_student.jpg")
 */
export async function uploadProfilePhoto(base64, path) {
  const arr = base64.split(','), mime = arr[0].match(/:(.*?);/)[1];
  const binary = atob(arr[1]);
  const len = binary.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
  const blob = new Blob([u8], { type: mime });
  const { error } = await supabase.storage.from('profile_photos').upload(path, blob, { contentType: mime, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('profile_photos').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload a base64 assignment attachment to Supabase Storage and return public URL.
 */
export async function uploadAssignmentPhoto(base64, path) {
  const arr = base64.split(','), mime = arr[0].match(/:(.*?);/)[1];
  const binary = atob(arr[1]);
  const len = binary.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
  const blob = new Blob([u8], { type: mime });
  const { error } = await supabase.storage.from('assignments').upload(path, blob, { contentType: mime, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('assignments').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Simple wrapper for anonymous sign‑in.
 */
export async function signInAnonymously() {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

// Retrieve admin user by username
export async function getAdminUser(username) {
  const { data, error } = await supabase.from('admin_users').select().eq('username', username).single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}
