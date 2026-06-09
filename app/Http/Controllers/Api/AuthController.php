<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        // Create default settings for user
        Setting::create([
            'user_id' => $user->id,
            'theme' => 'dark',
            'currency' => 'USD',
            'email_notifications' => true,
        ]);

        // Create default categories
        $defaultCategories = [
            ['name' => 'Salary', 'type' => 'income', 'color' => '#10B981', 'icon' => 'Briefcase'],
            ['name' => 'Freelance', 'type' => 'income', 'color' => '#3B82F6', 'icon' => 'Laptop'],
            ['name' => 'Investments', 'type' => 'income', 'color' => '#8B5CF6', 'icon' => 'TrendingUp'],
            ['name' => 'Housing & Rent', 'type' => 'expense', 'color' => '#EF4444', 'icon' => 'Home'],
            ['name' => 'Groceries', 'type' => 'expense', 'color' => '#F59E0B', 'icon' => 'ShoppingBag'],
            ['name' => 'Dining Out', 'type' => 'expense', 'color' => '#EC4899', 'icon' => 'Coffee'],
            ['name' => 'Utilities', 'type' => 'expense', 'color' => '#06B6D4', 'icon' => 'Zap'],
            ['name' => 'Transport', 'type' => 'expense', 'color' => '#6B7280', 'icon' => 'Car'],
            ['name' => 'Entertainment', 'type' => 'expense', 'color' => '#14B8A6', 'icon' => 'Film'],
        ];

        foreach ($defaultCategories as $cat) {
            $user->categories()->create($cat);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user->load('setting'),
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user->load('setting'),
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Successfully logged out.',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load('setting'));
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
        ]);

        $user->update([
            'name' => $request->name,
            'email' => $request->email,
        ]);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $user->load('setting'),
        ]);
    }

    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'current_password' => ['required', 'string', 'current_password'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }

    public function updateLanguage(Request $request)
    {
        $request->validate([
            'language' => ['required', 'string', 'in:en,fr,ar'],
        ]);

        $request->user()->update([
            'language' => $request->language,
        ]);

        return response()->json([
            'message' => 'Language preference updated successfully.',
            'user' => $request->user()->load('setting'),
        ]);
    }
}
