<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('fm_locks', function (Blueprint $table) { $table->unsignedInteger('id')->primary(); });
        DB::table('fm_locks')->insert(['id' => 1]);
        Schema::create('fm_nodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('fm_nodes')->restrictOnDelete();
            $table->string('owner_id', 191)->index();
            $table->string('kind', 10);
            $table->string('visibility', 10)->default('private');
            $table->string('name');
            $table->string('disk')->nullable();
            $table->string('path')->nullable();
            $table->string('thumbnail_path')->nullable();
            $table->string('mime')->nullable();
            $table->string('extension', 20)->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->uuid('trash_batch')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['parent_id', 'deleted_at']);
            $table->index(['visibility', 'kind']);
        });
        Schema::create('fm_grants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('node_id')->constrained('fm_nodes')->cascadeOnDelete();
            $table->string('user_id', 191);
            $table->boolean('view')->default(true);
            $table->boolean('upload')->default(false);
            $table->boolean('update')->default(false);
            $table->boolean('delete')->default(false);
            $table->timestamps();
            $table->unique(['node_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::withoutForeignKeyConstraints(function () {
            Schema::dropIfExists('fm_grants');
            Schema::dropIfExists('fm_nodes');
            Schema::dropIfExists('fm_locks');
        });
    }
};
