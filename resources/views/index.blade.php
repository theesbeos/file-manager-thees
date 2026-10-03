@php
    $layout = $layout ?? config('file-manager.layout');
    $section = $section ?? config('file-manager.section', 'content');
@endphp

@if(!empty($layout))
    @extends($layout)

    @section($section)
        <div class="kbtech-fm kbtech-fm-embedded">
            <link rel="stylesheet" href="{{ asset('vendor/file-manager/file-manager.css') }}">
            @include('file-manager::partials.app')
        </div>

        <script id="fm-settings" type="application/json">{!! json_encode($settings, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) !!}</script>
        <script src="{{ asset('vendor/file-manager/file-manager.js') }}" defer></script>
    @endsection
@else
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ $settings['csrf'] }}">
        <title>Thư viện tài nguyên · {{ $settings['brand']['name'] }}</title>
        <link rel="stylesheet" href="{{ asset('vendor/file-manager/file-manager.css') }}">
        <script id="fm-settings" type="application/json">{!! json_encode($settings, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) !!}</script>
        <script src="{{ asset('vendor/file-manager/file-manager.js') }}" defer></script>
    </head>
    <body>
        <div class="kbtech-fm kbtech-fm-standalone">
            @include('file-manager::partials.app')
        </div>
    </body>
    </html>
@endif
