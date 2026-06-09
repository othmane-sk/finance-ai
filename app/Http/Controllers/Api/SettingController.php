<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function show(Request $request)
    {
        $setting = $request->user()->setting;

        if (!$setting) {
            $setting = Setting::create([
                'user_id' => $request->user()->id,
                'theme' => 'dark',
                'currency' => 'USD',
                'email_notifications' => true,
            ]);
        }

        return response()->json($setting);
    }

    public function update(Request $request)
    {
        $setting = $request->user()->setting;

        if (!$setting) {
            $setting = new Setting();
            $setting->user_id = $request->user()->id;
        }

        $validated = $request->validate([
            'theme' => ['required', 'in:light,dark'],
            'currency' => ['required', 'string', 'max:10'],
            'email_notifications' => ['required', 'boolean'],
        ]);

        $setting->fill($validated);
        $setting->save();

        return response()->json($setting);
    }
}
