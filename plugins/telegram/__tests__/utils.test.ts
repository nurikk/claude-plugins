import { describe, expect, it } from 'bun:test'
import {
  chunk,
  defaultAccess,
  isAllowedChat,
  isMentioned,
  pruneExpired,
  safeName,
  type Access,
} from '../src/utils'

describe('defaultAccess', () => {
  it('returns pairing policy with empty lists', () => {
    const access = defaultAccess()
    expect(access.dmPolicy).toBe('pairing')
    expect(access.allowFrom).toEqual([])
    expect(access.groups).toEqual({})
    expect(access.pending).toEqual({})
  })

  it('returns a fresh object each call', () => {
    const a = defaultAccess()
    const b = defaultAccess()
    expect(a).not.toBe(b)
    a.allowFrom.push('123')
    expect(b.allowFrom).toEqual([])
  })
})

describe('pruneExpired', () => {
  it('removes expired pending entries', () => {
    const access = defaultAccess()
    access.pending = {
      abc123: {
        senderId: '1',
        chatId: '1',
        createdAt: Date.now() - 7200000,
        expiresAt: Date.now() - 3600000,
        replies: 1,
      },
    }
    const changed = pruneExpired(access)
    expect(changed).toBe(true)
    expect(Object.keys(access.pending)).toHaveLength(0)
  })

  it('keeps non-expired entries', () => {
    const access = defaultAccess()
    access.pending = {
      abc123: {
        senderId: '1',
        chatId: '1',
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        replies: 1,
      },
    }
    const changed = pruneExpired(access)
    expect(changed).toBe(false)
    expect(Object.keys(access.pending)).toHaveLength(1)
  })

  it('returns false when no pending entries', () => {
    const access = defaultAccess()
    expect(pruneExpired(access)).toBe(false)
  })

  it('prunes only expired entries in a mixed set', () => {
    const access = defaultAccess()
    access.pending = {
      expired1: {
        senderId: '1',
        chatId: '1',
        createdAt: Date.now() - 7200000,
        expiresAt: Date.now() - 1000,
        replies: 1,
      },
      valid1: {
        senderId: '2',
        chatId: '2',
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        replies: 1,
      },
    }
    const changed = pruneExpired(access)
    expect(changed).toBe(true)
    expect(access.pending['expired1']).toBeUndefined()
    expect(access.pending['valid1']).toBeDefined()
  })
})

describe('chunk', () => {
  it('returns single-element array for short text', () => {
    expect(chunk('hello', 100, 'length')).toEqual(['hello'])
  })

  it('returns single-element for text exactly at limit', () => {
    const text = 'a'.repeat(4096)
    expect(chunk(text, 4096, 'length')).toEqual([text])
  })

  it('splits long text in length mode', () => {
    const text = 'a'.repeat(5000)
    const chunks = chunk(text, 4096, 'length')
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toHaveLength(4096)
    expect(chunks[1]).toHaveLength(904)
  })

  it('prefers paragraph boundaries in newline mode', () => {
    const part1 = 'a'.repeat(2500)
    const part2 = 'b'.repeat(2500)
    const text = `${part1}\n\n${part2}`
    const chunks = chunk(text, 4096, 'newline')
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toBe(part1)
    expect(chunks[1]).toBe(part2)
  })

  it('falls back to single newline when no paragraph break', () => {
    const part1 = 'a'.repeat(2500)
    const part2 = 'b'.repeat(2500)
    const text = `${part1}\n${part2}`
    const chunks = chunk(text, 4096, 'newline')
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toBe(part1)
  })

  it('falls back to space when no newline available', () => {
    const part1 = 'hello world'
    const part2 = 'more text'
    const text = `${part1} ${part2}`
    const chunks = chunk(text, 15, 'newline')
    expect(chunks.length).toBeGreaterThanOrEqual(2)
    expect(chunks[0]).toBe(part1)
  })

  it('hard cuts when no whitespace in newline mode', () => {
    const text = 'a'.repeat(200)
    const chunks = chunk(text, 100, 'newline')
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toHaveLength(100)
  })

  it('handles empty string', () => {
    expect(chunk('', 100, 'length')).toEqual([''])
  })

  it('strips leading newlines from continuation chunks', () => {
    const text = 'abc\n\n\n\ndef'
    const chunks = chunk(text, 5, 'newline')
    // After splitting at a newline boundary, leading newlines are stripped
    for (const c of chunks) {
      expect(c.startsWith('\n')).toBe(false)
    }
  })
})

describe('safeName', () => {
  it('returns undefined for undefined input', () => {
    expect(safeName(undefined)).toBeUndefined()
  })

  it('passes through safe names', () => {
    expect(safeName('photo.jpg')).toBe('photo.jpg')
    expect(safeName('my_document-v2.pdf')).toBe('my_document-v2.pdf')
  })

  it('replaces angle brackets', () => {
    expect(safeName('<script>alert</script>')).toBe('_script_alert_/script_')
  })

  it('replaces square brackets', () => {
    expect(safeName('file[0].txt')).toBe('file_0_.txt')
  })

  it('replaces newlines and semicolons', () => {
    expect(safeName('file\nname;bad\rfile')).toBe('file_name_bad_file')
  })
})

describe('isAllowedChat', () => {
  it('allows chat_id in allowFrom', () => {
    const access = defaultAccess()
    access.allowFrom = ['123']
    expect(isAllowedChat('123', access)).toBe(true)
  })

  it('allows chat_id in groups', () => {
    const access = defaultAccess()
    access.groups['-1001234'] = { requireMention: true, allowFrom: [] }
    expect(isAllowedChat('-1001234', access)).toBe(true)
  })

  it('rejects unknown chat_id', () => {
    const access = defaultAccess()
    expect(isAllowedChat('999', access)).toBe(false)
  })
})

describe('isMentioned', () => {
  const botName = 'test_bot'

  it('detects structured @mention', () => {
    const text = '@test_bot hello'
    const entities = [{ type: 'mention', offset: 0, length: 9 }]
    expect(isMentioned(botName, entities, text, undefined)).toBe(true)
  })

  it('is case-insensitive for mentions', () => {
    const text = '@TEST_BOT hello'
    const entities = [{ type: 'mention', offset: 0, length: 9 }]
    expect(isMentioned(botName, entities, text, undefined)).toBe(true)
  })

  it('detects text_mention for bot user', () => {
    const entities = [{
      type: 'text_mention',
      offset: 0,
      length: 5,
      user: { is_bot: true, username: 'test_bot' },
    }]
    expect(isMentioned(botName, entities, 'hello', undefined)).toBe(true)
  })

  it('detects reply to bot message', () => {
    expect(isMentioned(botName, [], 'hello', 'test_bot')).toBe(true)
  })

  it('does not match reply to other user', () => {
    expect(isMentioned(botName, [], 'hello', 'other_user')).toBe(false)
  })

  it('matches custom mention patterns', () => {
    expect(
      isMentioned(botName, [], 'hey claude how are you', undefined, ['^hey claude\\b']),
    ).toBe(true)
  })

  it('ignores invalid regex patterns', () => {
    expect(
      isMentioned(botName, [], 'hello', undefined, ['[invalid']),
    ).toBe(false)
  })

  it('returns false when nothing matches', () => {
    expect(isMentioned(botName, [], 'hello world', undefined)).toBe(false)
  })

  it('does not match mention of different bot', () => {
    const text = '@other_bot hello'
    const entities = [{ type: 'mention', offset: 0, length: 10 }]
    expect(isMentioned(botName, entities, text, undefined)).toBe(false)
  })
})
