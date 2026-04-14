from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time, os

opts = webdriver.ChromeOptions()
opts.add_argument('--headless=new')
driver = webdriver.Chrome(options=opts)

try:
    os.makedirs("logs/diag", exist_ok=True)
    driver.get('https://prod2.seace.gob.pe/seacebus-uiwd-pub/buscadorPublico/buscadorPublico.xhtml')
    time.sleep(5)
    driver.save_screenshot("logs/diag/1_inicio.png")
    
    # Click Procedimientos
    tab = driver.find_element(By.XPATH, "//a[contains(., 'Procedimientos')]")
    driver.execute_script("arguments[0].click()", tab)
    time.sleep(4)
    driver.save_screenshot("logs/diag/2_tab_procedimientos.png")
    
    # Click Avanzada
    btn_adv = driver.find_element(By.XPATH, "//*[contains(text(), 'Avanzada')]")
    driver.execute_script("arguments[0].click()", btn_adv)
    time.sleep(3)
    driver.save_screenshot("logs/diag/3_avanzada.png")
    
    # List all inputs
    inputs = driver.find_elements(By.TAG_NAME, 'input')
    for i in inputs:
        if i.is_displayed():
            print(f"ID: {i.get_attribute('id')} | Name: {i.get_attribute('name')} | Value: {i.get_attribute('value')}")
            
    # List all buttons
    btns = driver.find_elements(By.TAG_NAME, 'button')
    for b in btns:
        if b.is_displayed():
            print(f"BTN Text: {b.text} | ID: {b.get_attribute('id')}")

finally:
    driver.quit()
