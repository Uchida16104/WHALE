<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use App\Models\DailyRecord;

class DailyRecordController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = DailyRecord::query();

            if ($request->has('userId')) {
                $query->where('user_id', $request->userId);
            }

            if ($request->has('date')) {
                $query->whereDate('date', $request->date);
            }

            if ($request->has('startDate') && $request->has('endDate')) {
                $query->whereBetween('date', [$request->startDate, $request->endDate]);
            }

            $records = $query->orderBy('date', 'desc')->paginate(50);

            return response()->json([
                'success' => true,
                'data' => $records
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get records',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'userId' => 'required|exists:users,id',
                'date' => 'required|date',
                'wakeUpTime' => 'nullable|string',
                'sleepTime' => 'nullable|string',
                'arrivalTime' => 'nullable|string',
                'departureTime' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $existingRecord = DailyRecord::where('user_id', $request->userId)
                ->whereDate('date', $request->date)
                ->first();

            if ($existingRecord) {
                $record = $this->updateRecord($existingRecord, $request->all());
            } else {
                $record = DailyRecord::create([
                    'user_id' => $request->userId,
                    'date' => $request->date,
                    'wake_up_time' => $request->wakeUpTime,
                    'sleep_time' => $request->sleepTime,
                    'arrival_time' => $request->arrivalTime,
                    'departure_time' => $request->departureTime,
                    'breakfast' => $request->breakfast ?? false,
                    'breakfast_appetite' => $request->breakfastAppetite ?? 5,
                    'breakfast_content' => $request->breakfastContent,
                    'lunch' => $request->lunch ?? false,
                    'lunch_appetite' => $request->lunchAppetite ?? 5,
                    'lunch_content' => $request->lunchContent,
                    'dinner' => $request->dinner ?? false,
                    'dinner_appetite' => $request->dinnerAppetite ?? 5,
                    'dinner_content' => $request->dinnerContent,
                    'meal_provided' => $request->mealProvided ?? false,
                    'exercise' => $request->exercise ?? false,
                    'exercise_type' => $request->exerciseType,
                    'exercise_duration' => $request->exerciseDuration ?? 0,
                    'steps' => $request->steps ?? 0,
                    'bathing' => $request->bathing ?? false,
                    'bathing_time' => $request->bathingTime,
                    'bathing_assistance' => $request->bathingAssistance,
                    'washing' => $request->washing ?? false,
                    'tooth_brushing' => $request->toothBrushing ?? false,
                    'morning_medication' => $request->morningMedication ?? false,
                    'morning_medication_list' => $request->morningMedicationList,
                    'morning_medication_time' => $request->morningMedicationTime,
                    'noon_medication' => $request->noonMedication ?? false,
                    'noon_medication_list' => $request->noonMedicationList,
                    'noon_medication_time' => $request->noonMedicationTime,
                    'evening_medication' => $request->eveningMedication ?? false,
                    'evening_medication_list' => $request->eveningMedicationList,
                    'evening_medication_time' => $request->eveningMedicationTime,
                    'bedtime_medication' => $request->bedtimeMedication ?? false,
                    'bedtime_medication_list' => $request->bedtimeMedicationList,
                    'bedtime_medication_time' => $request->bedtimeMedicationTime,
                    'pre_medication' => $request->preMedication ?? false,
                    'pre_medication_reason' => $request->preMedicationReason,
                    'pre_medication_list' => $request->preMedicationList,
                    'pre_medication_time' => $request->preMedicationTime,
                    'body_temperature' => $request->bodyTemperature,
                    'blood_pressure_systolic' => $request->bloodPressureSystolic,
                    'blood_pressure_diastolic' => $request->bloodPressureDiastolic,
                    'pulse' => $request->pulse,
                    'spo2' => $request->spo2,
                    'emotion_icon' => $request->emotionIcon ?? 5,
                    'mood_score' => $request->moodScore ?? 5,
                    'mood_detail' => $request->moodDetail,
                    'thoughts' => $request->thoughts,
                    'feelings' => $request->feelings,
                    'worries' => $request->worries,
                    'concerns' => $request->concerns,
                    'consultation' => $request->consultation,
                    'contact' => $request->contact,
                    'report' => $request->report,
                    'chat' => $request->chat,
                    'achievements' => $request->achievements,
                    'improvements' => $request->improvements,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            $this->checkVitalAlerts($record);

            DB::table('access_logs')->insert([
                'user_id' => $request->user()->id ?? null,
                'user_type' => $request->user()->role ?? 'system',
                'action' => 'daily_record_create',
                'target_id' => $record->id,
                'ip_address' => $request->ip(),
                'created_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Record saved successfully',
                'data' => $record
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to save record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $record = DailyRecord::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $record
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Record not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $record = DailyRecord::findOrFail($id);
            
            $this->updateRecord($record, $request->all());

            $this->checkVitalAlerts($record);

            DB::table('access_logs')->insert([
                'user_id' => $request->user()->id ?? null,
                'user_type' => $request->user()->role ?? 'system',
                'action' => 'daily_record_update',
                'target_id' => $record->id,
                'ip_address' => $request->ip(),
                'created_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Record updated successfully',
                'data' => $record
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $record = DailyRecord::findOrFail($id);
            $record->delete();

            return response()->json([
                'success' => true,
                'message' => 'Record deleted successfully'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getByUser($userId)
    {
        try {
            $records = DailyRecord::where('user_id', $userId)
                ->orderBy('date', 'desc')
                ->paginate(50);

            return response()->json([
                'success' => true,
                'data' => $records
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get records',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getByDate($date)
    {
        try {
            $records = DailyRecord::whereDate('date', $date)
                ->orderBy('user_id')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $records
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get records',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getByDateRange(Request $request, $userId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'startDate' => 'required|date',
                'endDate' => 'required|date|after_or_equal:startDate'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $records = DailyRecord::where('user_id', $userId)
                ->whereBetween('date', [$request->startDate, $request->endDate])
                ->orderBy('date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $records
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get records',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function updateRecord($record, $data)
    {
        $fieldsToUpdate = [
            'wake_up_time' => $data['wakeUpTime'] ?? null,
            'sleep_time' => $data['sleepTime'] ?? null,
            'arrival_time' => $data['arrivalTime'] ?? null,
            'departure_time' => $data['departureTime'] ?? null,
            'breakfast' => $data['breakfast'] ?? $record->breakfast,
            'breakfast_appetite' => $data['breakfastAppetite'] ?? $record->breakfast_appetite,
            'breakfast_content' => $data['breakfastContent'] ?? $record->breakfast_content,
            'lunch' => $data['lunch'] ?? $record->lunch,
            'lunch_appetite' => $data['lunchAppetite'] ?? $record->lunch_appetite,
            'lunch_content' => $data['lunchContent'] ?? $record->lunch_content,
            'dinner' => $data['dinner'] ?? $record->dinner,
            'dinner_appetite' => $data['dinnerAppetite'] ?? $record->dinner_appetite,
            'dinner_content' => $data['dinnerContent'] ?? $record->dinner_content,
            'meal_provided' => $data['mealProvided'] ?? $record->meal_provided,
            'exercise' => $data['exercise'] ?? $record->exercise,
            'exercise_type' => $data['exerciseType'] ?? $record->exercise_type,
            'exercise_duration' => $data['exerciseDuration'] ?? $record->exercise_duration,
            'steps' => $data['steps'] ?? $record->steps,
            'bathing' => $data['bathing'] ?? $record->bathing,
            'bathing_time' => $data['bathingTime'] ?? $record->bathing_time,
            'bathing_assistance' => $data['bathingAssistance'] ?? $record->bathing_assistance,
            'washing' => $data['washing'] ?? $record->washing,
            'tooth_brushing' => $data['toothBrushing'] ?? $record->tooth_brushing,
            'morning_medication' => $data['morningMedication'] ?? $record->morning_medication,
            'morning_medication_list' => $data['morningMedicationList'] ?? $record->morning_medication_list,
            'morning_medication_time' => $data['morningMedicationTime'] ?? $record->morning_medication_time,
            'noon_medication' => $data['noonMedication'] ?? $record->noon_medication,
            'noon_medication_list' => $data['noonMedicationList'] ?? $record->noon_medication_list,
            'noon_medication_time' => $data['noonMedicationTime'] ?? $record->noon_medication_time,
            'evening_medication' => $data['eveningMedication'] ?? $record->evening_medication,
            'evening_medication_list' => $data['eveningMedicationList'] ?? $record->evening_medication_list,
            'evening_medication_time' => $data['eveningMedicationTime'] ?? $record->evening_medication_time,
            'bedtime_medication' => $data['bedtimeMedication'] ?? $record->bedtime_medication,
            'bedtime_medication_list' => $data['bedtimeMedicationList'] ?? $record->bedtime_medication_list,
            'bedtime_medication_time' => $data['bedtimeMedicationTime'] ?? $record->bedtime_medication_time,
            'pre_medication' => $data['preMedication'] ?? $record->pre_medication,
            'pre_medication_reason' => $data['preMedicationReason'] ?? $record->pre_medication_reason,
            'pre_medication_list' => $data['preMedicationList'] ?? $record->pre_medication_list,
            'pre_medication_time' => $data['preMedicationTime'] ?? $record->pre_medication_time,
            'body_temperature' => $data['bodyTemperature'] ?? $record->body_temperature,
            'blood_pressure_systolic' => $data['bloodPressureSystolic'] ?? $record->blood_pressure_systolic,
            'blood_pressure_diastolic' => $data['bloodPressureDiastolic'] ?? $record->blood_pressure_diastolic,
            'pulse' => $data['pulse'] ?? $record->pulse,
            'spo2' => $data['spo2'] ?? $record->spo2,
            'emotion_icon' => $data['emotionIcon'] ?? $record->emotion_icon,
            'mood_score' => $data['moodScore'] ?? $record->mood_score,
            'mood_detail' => $data['moodDetail'] ?? $record->mood_detail,
            'thoughts' => $data['thoughts'] ?? $record->thoughts,
            'feelings' => $data['feelings'] ?? $record->feelings,
            'worries' => $data['worries'] ?? $record->worries,
            'concerns' => $data['concerns'] ?? $record->concerns,
            'consultation' => $data['consultation'] ?? $record->consultation,
            'contact' => $data['contact'] ?? $record->contact,
            'report' => $data['report'] ?? $record->report,
            'chat' => $data['chat'] ?? $record->chat,
            'achievements' => $data['achievements'] ?? $record->achievements,
            'improvements' => $data['improvements'] ?? $record->improvements,
            'updated_at' => now()
        ];

        $record->update($fieldsToUpdate);
        return $record;
    }

    private function checkVitalAlerts($record)
    {
        $alerts = [];

        if ($record->body_temperature) {
            $temp = floatval($record->body_temperature);
            if ($temp >= 38.0) {
                $alerts[] = [
                    'type' => 'high_temperature',
                    'severity' => 'high',
                    'message' => "High temperature detected: {$temp}°C"
                ];
            } elseif ($temp <= 35.0) {
                $alerts[] = [
                    'type' => 'low_temperature',
                    'severity' => 'high',
                    'message' => "Low temperature detected: {$temp}°C"
                ];
            }
        }

        if ($record->blood_pressure_systolic && $record->blood_pressure_diastolic) {
            $systolic = intval($record->blood_pressure_systolic);
            $diastolic = intval($record->blood_pressure_diastolic);
            
            if ($systolic >= 180 || $diastolic >= 110) {
                $alerts[] = [
                    'type' => 'high_blood_pressure',
                    'severity' => 'high',
                    'message' => "High blood pressure detected: {$systolic}/{$diastolic} mmHg"
                ];
            } elseif ($systolic <= 90 || $diastolic <= 60) {
                $alerts[] = [
                    'type' => 'low_blood_pressure',
                    'severity' => 'medium',
                    'message' => "Low blood pressure detected: {$systolic}/{$diastolic} mmHg"
                ];
            }
        }

        if ($record->spo2) {
            $spo2 = intval($record->spo2);
            if ($spo2 < 95) {
                $alerts[] = [
                    'type' => 'low_spo2',
                    'severity' => 'high',
                    'message' => "Low SpO2 detected: {$spo2}%"
                ];
            }
        }

        if (!empty($alerts)) {
            foreach ($alerts as $alert) {
                DB::table('vital_alerts')->insert([
                    'daily_record_id' => $record->id,
                    'user_id' => $record->user_id,
                    'alert_type' => $alert['type'],
                    'severity' => $alert['severity'],
                    'message' => $alert['message'],
                    'is_resolved' => false,
                    'created_at' => now()
                ]);
            }
        }
    }
}