import { useState } from 'react';

export default function PasswordInput({ id, value, onChange, placeholder, required, label, className, style }) {
  const [show, setShow] = useState(false);
  return (
    <div className="form-group" style={style}>
      {label && <label className="form-label" htmlFor={id}>{label}</label>}
      <div className="password-wrapper" style={{ position: 'relative' }}>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className={className || 'form-input'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          style={{ paddingRight: 40 }}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          tabIndex={-1}
          aria-label={show ? 'Nascondi password' : 'Mostra password'}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '8px', margin: 0, zIndex: 2, borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#888', fontSize: 18, lineHeight: 1,
          }}
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  );
}