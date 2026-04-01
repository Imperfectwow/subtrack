-- Step 1: Auth user                                                                                                                                                                   
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)                                   
  VALUES (                                                                                                                                                                               
    'aaaaaaaa-0000-0000-0000-000000000001',                                                                                                                                              
    'test-assistant@subtrack.test',                                                                                                                                                      
    '',                                                                                                                                                                                  
    now(), now(), now(),                                    
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',                                                                                                                                                                     
    'authenticated'
  );                                                                                                                                                                                     
                                                            
  -- Step 2: Profile (replace the UUID below with your actual municipality id)                                                                                                           
  INSERT INTO profiles (id, municipality_id, role, full_name, phone, whatsapp_phone, is_active)
  VALUES (                                                                                                                                                                               
    'aaaaaaaa-0000-0000-0000-000000000001',                 
    '11111111-0000-0000-0000-000000000001',                                                                                                                                              
    'assistant',
  'הקידב תעייסמ',                                                                                                                                                                      
    '0526305294',                                                                                                                                                                        
    '0526305294',
    true                                                                                                                                                                                 
  );                                                        

  -- Step 3: Assistant
  INSERT INTO assistants (id, municipality_id, current_location, subjects, grades, rating, is_available)
  VALUES (                                                                                                                                                                               
    'aaaaaaaa-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001',                                                                                                                                              
    st_point(34.7741, 32.0853)::geography,                  
    ARRAY['םיעדמ' ,'תילגנא' ,'הקיטמתמ'],                                                                                                                                                 
    ARRAY['ו' ,'ה' ,'ד' ,'ג' ,'ב' ,'א'],
    4.80,                                                                                                                                                                                
    true                                                    
  );                              