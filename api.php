<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\FacilityController;
use App\Http\Controllers\DailyRecordController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\MedicationController;
use App\Http\Controllers\VitalSignController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\ServicePlanController;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    
    Route::apiResource('facilities', FacilityController::class);
    Route::apiResource('users', UserController::class);
    Route::apiResource('staff', StaffController::class);
    
    Route::apiResource('daily-records', DailyRecordController::class);
    Route::get('/daily-records/user/{userId}', [DailyRecordController::class, 'getByUser']);
    Route::get('/daily-records/date/{date}', [DailyRecordController::class, 'getByDate']);
    Route::get('/daily-records/user/{userId}/date-range', [DailyRecordController::class, 'getByDateRange']);
    
    Route::apiResource('medications', MedicationController::class);
    Route::get('/medications/user/{userId}', [MedicationController::class, 'getByUser']);
    Route::post('/medications/schedule', [MedicationController::class, 'createSchedule']);
    
    Route::apiResource('vital-signs', VitalSignController::class);
    Route::get('/vital-signs/user/{userId}', [VitalSignController::class, 'getByUser']);
    Route::get('/vital-signs/user/{userId}/latest', [VitalSignController::class, 'getLatest']);
    Route::post('/vital-signs/alert', [VitalSignController::class, 'checkAlert']);
    
    Route::apiResource('assessments', AssessmentController::class);
    Route::get('/assessments/user/{userId}', [AssessmentController::class, 'getByUser']);
    Route::post('/assessments/{id}/approve', [AssessmentController::class, 'approve']);
    
    Route::apiResource('service-plans', ServicePlanController::class);
    Route::get('/service-plans/user/{userId}', [ServicePlanController::class, 'getByUser']);
    Route::post('/service-plans/{id}/approve', [ServicePlanController::class, 'approve']);
    
    Route::prefix('reports')->group(function () {
        Route::get('/monthly/{year}/{month}', [ReportController::class, 'monthly']);
        Route::get('/weekly/{year}/{week}', [ReportController::class, 'weekly']);
        Route::get('/user/{userId}', [ReportController::class, 'userReport']);
        Route::get('/facility', [ReportController::class, 'facilityReport']);
        Route::get('/attendance', [ReportController::class, 'attendanceReport']);
        Route::get('/vital-trends/{userId}', [ReportController::class, 'vitalTrends']);
    });
    
    Route::prefix('export')->group(function () {
        Route::post('/pdf', [ExportController::class, 'exportPdf']);
        Route::post('/excel', [ExportController::class, 'exportExcel']);
        Route::post('/word', [ExportController::class, 'exportWord']);
        Route::post('/csv', [ExportController::class, 'exportCsv']);
        Route::post('/daily-record/pdf/{id}', [ExportController::class, 'exportDailyRecordPdf']);
        Route::post('/assessment/pdf/{id}', [ExportController::class, 'exportAssessmentPdf']);
        Route::post('/service-plan/pdf/{id}', [ExportController::class, 'exportServicePlanPdf']);
    });
    
    Route::get('/dashboard/admin', [ReportController::class, 'adminDashboard']);
    Route::get('/dashboard/staff', [ReportController::class, 'staffDashboard']);
    Route::get('/dashboard/user/{userId}', [ReportController::class, 'userDashboard']);
    
    Route::post('/search', [UserController::class, 'search']);
    Route::get('/statistics/facility', [ReportController::class, 'facilityStatistics']);
    Route::get('/statistics/user/{userId}', [ReportController::class, 'userStatistics']);
});