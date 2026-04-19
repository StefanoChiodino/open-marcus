"""Initial migration - create all tables

Revision ID: 001_initial
Revises: 
Create Date: 2026-04-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('username', sa.String(255), unique=True, nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_users_username', 'users', ['username'], unique=True)
    
    # Create profiles table
    op.create_table(
        'profiles',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), unique=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('goals', sa.Text, nullable=False, default=''),
        sa.Column('experience_level', sa.String(50), nullable=False, default='beginner'),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_profiles_user_id', 'profiles', ['user_id'], unique=True)
    
    # Create sessions table
    op.create_table(
        'sessions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('state', sa.String(20), nullable=False, default='intro'),
        sa.Column('summary', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=True),
        sa.Column('concluded_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_sessions_user_id', 'sessions', ['user_id'])
    
    # Create messages table
    op.create_table(
        'messages',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('session_id', sa.String(36), sa.ForeignKey('sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_messages_session_id', 'messages', ['session_id'])
    
    # Create psych_updates table
    op.create_table(
        'psych_updates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('message_id', sa.String(36), sa.ForeignKey('messages.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('detected_patterns', sa.JSON, nullable=False, default=list),
        sa.Column('emotional_state', sa.String(100), nullable=False, default='unknown'),
        sa.Column('stoic_principle_applied', sa.String(255), nullable=True),
        sa.Column('suggested_direction', sa.Text, nullable=True),
        sa.Column('confidence', sa.Float, nullable=False, default=0.5),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_psych_updates_message_id', 'psych_updates', ['message_id'])
    
    # Create semantic_assertions table
    op.create_table(
        'semantic_assertions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_message_id', sa.String(36), sa.ForeignKey('messages.id', ondelete='SET NULL'), nullable=True),
        sa.Column('psych_update_id', sa.String(36), sa.ForeignKey('psych_updates.id', ondelete='CASCADE'), nullable=True),
        sa.Column('text', sa.String(500), nullable=False),
        sa.Column('confidence', sa.Float, nullable=False, default=0.5),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_semantic_assertions_user_id', 'semantic_assertions', ['user_id'])
    
    # Create settings table
    op.create_table(
        'settings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), unique=True, nullable=False),
        sa.Column('selected_model', sa.String(255), nullable=True),
        sa.Column('tts_voice', sa.String(100), nullable=False, default='en_US-lessac-medium'),
        sa.Column('tts_speed', sa.Float, nullable=False, default=1.0),
        sa.Column('stt_enabled', sa.Boolean, nullable=False, default=True),
        sa.Column('ram_detected', sa.Float, nullable=True),
        sa.Column('theme', sa.String(20), nullable=False, default='light'),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_settings_user_id', 'settings', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_table('settings')
    op.drop_table('semantic_assertions')
    op.drop_table('psych_updates')
    op.drop_table('messages')
    op.drop_table('sessions')
    op.drop_table('profiles')
    op.drop_table('users')
