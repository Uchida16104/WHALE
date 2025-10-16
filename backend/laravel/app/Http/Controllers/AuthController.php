<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use App\Models\Facility;
use App\Models\User;
use App\Models\Admin;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'facilityName' => 'required|string|max:255',
                'facilityPostalCode' => 'required|string|max:10',
                'facilityAddress' => 'required|string|max:500',
                'facilityPhone' => 'required|string|max:20',
                'facilityFoundedDate' => 'nullable|date',
                'adminName' => 'required|string|max:255',
                'adminNameKana' => 'required|string|max:255',
                'adminPostalCode' => 'required|string|max:10',
                'adminAddress' => 'required|string|max:500',
                'adminPhone' => 'required|string|max:20',
                'adminBirthdate' => 'required|date',
                'facilityId' => 'required|string|min:4|max:50|unique:facilities,facility_id',
                'adminId' => 'required|string|min:4|max:50',
                'adminPassword' => 'required|string|min:8',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $facility = Facility::create([
                'facility_id' => $request->facilityId,
                'name' => $request->facilityName,
                'postal_code' => $request->facilityPostalCode,
                'address' => $request->facilityAddress,
                'phone' => $request->facilityPhone,
                'founded_date' => $request->facilityFoundedDate,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            $admin = Admin::create([
                'facility_id' => $facility->id,
                'admin_id' => $request->adminId,
                'name' => $request->adminName,
                'name_kana' => $request->adminNameKana,
                'postal_code' => $request->adminPostalCode,
                'address' => $request->adminAddress,
                'phone' => $request->adminPhone,
                'birthdate' => $request->adminBirthdate,
                'password' => Hash::make($request->adminPassword),
                'role' => 'admin',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Registration successful',
                'data' => [
                    'facility' => $facility,
                    'admin' => [
                        'id' => $admin->id,
                        'name' => $admin->name,
                        'role' => $admin->role
                    ]
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Registration failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function login(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'facilityId' => 'required|string',
                'userId' => 'required|string',
                'password' => 'required|string',
                'userType' => 'required|in:admin,staff,user'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $facility = Facility::where('facility_id', $request->facilityId)->first();

            if (!$facility) {
                return response()->json([
                    'success' => false,
                    'message' => 'Facility not found'
                ], 404);
            }

            $user = null;
            $userType = $request->userType;

            if ($userType === 'admin') {
                $user = Admin::where('facility_id', $facility->id)
                    ->where('admin_id', $request->userId)
                    ->where('status', 'active')
                    ->first();
            } elseif ($userType === 'staff') {
                $user = DB::table('staff')
                    ->where('facility_id', $facility->id)
                    ->where('staff_id', $request->userId)
                    ->where('status', 'active')
                    ->first();
            } else {
                $user = User::where('facility_id', $facility->id)
                    ->where('user_id', $request->userId)
                    ->where('status', 'active')
                    ->first();
            }

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            if (!Hash::check($request->password, $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid password'
                ], 401);
            }

            $token = bin2hex(random_bytes(32));
            
            DB::table('sessions')->insert([
                'user_id' => $user->id,
                'user_type' => $userType,
                'token' => hash('sha256', $token),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'last_activity' => now(),
                'created_at' => now()
            ]);

            DB::table('access_logs')->insert([
                'user_id' => $user->id,
                'user_type' => $userType,
                'action' => 'login',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'facilityId' => $request->facilityId,
                    'userId' => $request->userId,
                    'name' => $user->name,
                    'role' => $userType,
                    'email' => $user->email ?? null,
                    'phone' => $user->phone ?? null
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Login failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function logout(Request $request)
    {
        try {
            $token = $request->bearerToken();
            
            if ($token) {
                DB::table('sessions')
                    ->where('token', hash('sha256', $token))
                    ->delete();

                $user = $request->user();
                if ($user) {
                    DB::table('access_logs')->insert([
                        'user_id' => $user->id,
                        'user_type' => $user->role,
                        'action' => 'logout',
                        'ip_address' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                        'created_at' => now()
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Logout successful'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Logout failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function me(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            return response()->json([
                'success' => true,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'email' => $user->email ?? null,
                    'phone' => $user->phone ?? null
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get user info',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
