# To use a consistent encoding
from os import path

from setuptools import setup

# The directory containing this file
HERE = path.abspath(path.dirname(__file__))

# Get the long description from the README file
with open(path.join(HERE, "README.md"), encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="ragstar",
    version="0.2.1",
    description="RAG based LLM chatbot for dbt projects.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/pragunbhutani/ragstar",
    author="Pragun Bhutani",
    author_email="bhutani.pragun@gmail.com",
    license="MIT",
    classifiers=[
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Operating System :: OS Independent",
    ],
    packages=["ragstar"],
    include_package_data=True,
    install_requires=[
        "pyyaml",
        "typing_extensions",
        "chromadb",
        "openai",
        "pylint",
        "sphinx",
        "recommonmark",
        "sphinx_rtd_theme",
    ],
)
